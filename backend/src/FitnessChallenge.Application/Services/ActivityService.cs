using FitnessChallenge.Application.DTOs;
using FitnessChallenge.Domain.Entities;
using FitnessChallenge.Domain.Interfaces;
using Sport = FitnessChallenge.Domain.Enums.Sport;

namespace FitnessChallenge.Application.Services;

public class ActivityService : IActivityService
{
    private readonly IActivityRepository _activityRepository;
    private readonly IUserRepository _userRepository;
    private readonly IScoringService _scoringService;

    public ActivityService(
        IActivityRepository activityRepository,
        IUserRepository userRepository,
        IScoringService scoringService)
    {
        _activityRepository = activityRepository;
        _userRepository = userRepository;
        _scoringService = scoringService;
    }

    public async Task<ActivityResponse> AddActivityAsync(ActivityIngestRequest request, CancellationToken cancellationToken = default)
    {
        var sport = request.Sport is null ? (Sport?)null : Enum.Parse<Sport>(request.Sport, ignoreCase: true);

        var points = _scoringService.CalculatePoints(new ActivityInput(sport, request.Steps, request.Distance, request.Duration));

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            UserId = Guid.Parse(request.UserId),
            DateTime = DateTimeOffset.Parse(request.DateTime).UtcDateTime,
            Sport = sport,
            Steps = request.Steps,
            Distance = request.Distance,
            Duration = request.Duration,
            Points = points
        };

        await _activityRepository.AddAsync(activity, cancellationToken);

        return ToResponse(activity);
    }

    public async Task<IReadOnlyList<ActivityResponse>> GetActivitiesByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activities = await _activityRepository.GetByUserIdAsync(userId, cancellationToken);
        return activities.Select(ToResponse).ToList();
    }

    // Separate from the method above: charts/stat cards on the dashboard need the
    // user's entire activity history to aggregate correctly (monthly totals, sport
    // breakdown, 28-day heatmap), so that path stays unpaged. This one backs the
    // browsable activity history table specifically — Skip/Take runs in the DB via
    // the repository, so only one page's worth of rows is ever materialized.
    public async Task<(IReadOnlyList<ActivityResponse> Items, int TotalCount)> GetActivitiesByUserIdPagedAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var (activities, totalCount) = await _activityRepository.GetByUserIdPagedAsync(userId, page, pageSize, cancellationToken);
        return (activities.Select(ToResponse).ToList(), totalCount);
    }

    // Two DB round trips per snapshot (users + activity sums), not N+1 (each query
    // runs once, regardless of user count). Could be merged into a single LEFT JOIN
    // query for fewer round trips, but that would require the service to query
    // across repositories directly instead of through IUserRepository/IActivityRepository
    // — trading layer separation for one less round trip. Not worth it unless this
    // endpoint becomes a hot path.
    //
    // Trend is computed live, entirely from Activity rows — no history table, no
    // background job. "Now" is the sum of all activities; "before" is the sum of
    // activities strictly before the window's cutoff. Both snapshots are ranked with
    // the identical ordering (points desc, then last/first name) so a user's rank
    // only moves between snapshots because someone's point total actually changed,
    // never because of ordering differences. Comparison is by UserId, not list
    // index, since the set of users can differ between the two snapshots.
    // Pagination is applied last, in-memory, to the fully-ranked result — ranking
    // itself can't be paginated at the query level, since a user's correct rank
    // depends on comparing against every other user, not just the ones on the
    // requested page. Only the requested page's worth of entries crosses the
    // wire in the response, with TotalCount reflecting the full roster.
    public async Task<(IReadOnlyList<LeaderboardEntryResponse> Entries, int TotalCount)> GetLeaderboardAsync(
        LeaderboardWindow window = LeaderboardWindow.AllTime,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllAsync(cancellationToken);

        var currentSummaries = await _activityRepository.GetLeaderboardAsync(before: null, cancellationToken: cancellationToken);
        var currentRanked = RankUsers(users, currentSummaries.ToDictionary(s => s.UserId, s => s.TotalPoints));

        Dictionary<Guid, (int Rank, int TotalPoints)>? previousStateByUserId = null;
        HashSet<Guid>? usersWithPriorActivity = null;

        if (window != LeaderboardWindow.AllTime)
        {
            var cutoff = GetCutoff(window);
            var previousSummaries = await _activityRepository.GetLeaderboardAsync(before: cutoff, cancellationToken: cancellationToken);
            // A user absent from previousSummaries has zero activities before the
            // cutoff — that's how "new" is distinguished from "tied at zero points".
            usersWithPriorActivity = previousSummaries.Select(s => s.UserId).ToHashSet();
            previousStateByUserId = RankUsers(users, previousSummaries.ToDictionary(s => s.UserId, s => s.TotalPoints))
                .ToDictionary(x => x.User.Id, x => (x.Rank, x.TotalPoints));
        }

        var result = new List<LeaderboardEntryResponse>(currentRanked.Count);
        foreach (var (user, totalPoints, rank) in currentRanked)
        {
            // "new" (no activity before the cutoff) and AllTime (no cutoff at all)
            // both mean there's no meaningful prior state to report alongside the trend.
            var hasPriorState = window != LeaderboardWindow.AllTime && usersWithPriorActivity!.Contains(user.Id);
            var previousState = hasPriorState ? previousStateByUserId![user.Id] : ((int Rank, int TotalPoints)?)null;

            result.Add(new LeaderboardEntryResponse
            {
                Rank = rank,
                UserId = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                TotalPoints = totalPoints,
                Trend = ComputeTrend(window, rank, previousState?.Rank, hasPriorState),
                PreviousRank = previousState?.Rank,
                PreviousPoints = previousState?.TotalPoints,
                PositionChange = previousState is null ? null : previousState.Value.Rank - rank
            });
        }

        var pagedEntries = result.Skip((page - 1) * pageSize).Take(pageSize).ToList();
        return (pagedEntries, result.Count);
    }

    // Secondary sort by name gives a deterministic order among tied users —
    // GetAllAsync has no defined order of its own, and relying on it would let
    // tied users swap positions between calls with no data change.
    private static List<(User User, int TotalPoints, int Rank)> RankUsers(
        IReadOnlyList<User> users,
        IReadOnlyDictionary<Guid, int> pointsByUserId)
    {
        var sorted = users
            .Select(u => new { User = u, TotalPoints = pointsByUserId.GetValueOrDefault(u.Id, 0) })
            .OrderByDescending(x => x.TotalPoints)
            .ThenBy(x => x.User.LastName)
            .ThenBy(x => x.User.FirstName)
            .ToList();

        var result = new List<(User, int, int)>(sorted.Count);
        var rank = 0;
        int? previousPoints = null;

        foreach (var x in sorted)
        {
            if (previousPoints is null || x.TotalPoints != previousPoints.Value)
            {
                rank++;
            }
            previousPoints = x.TotalPoints;
            result.Add((x.User, x.TotalPoints, rank));
        }

        return result;
    }

    private static string ComputeTrend(
        LeaderboardWindow window,
        int currentRank,
        int? previousRank,
        bool hasPriorState)
    {
        // AllTime has no "before" snapshot to compare against — trend is meaningless.
        if (window == LeaderboardWindow.AllTime)
        {
            return "-";
        }

        if (!hasPriorState)
        {
            return "new";
        }

        if (currentRank < previousRank!.Value)
        {
            return "up";
        }
        if (currentRank > previousRank!.Value)
        {
            return "down";
        }
        return "same";
    }

    // now.Date is UTC midnight — window boundaries are defined in UTC. A user in a
    // different timezone may see "today"/"week"/"month" cross over at a different
    // local moment than their own calendar day/week/month. Acceptable for this
    // scope; a more robust version would accept the client's timezone offset.
    private static DateTime GetCutoff(LeaderboardWindow window)
    {
        var now = DateTime.UtcNow;
        return window switch
        {
            LeaderboardWindow.Today => now.Date,
            LeaderboardWindow.Week => now.Date.AddDays(-(int)now.DayOfWeek + (now.DayOfWeek == DayOfWeek.Sunday ? -6 : 1)),
            LeaderboardWindow.Month => new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            LeaderboardWindow.AllTime => DateTime.MinValue,
            _ => throw new ArgumentOutOfRangeException(nameof(window))
        };
    }

    private static ActivityResponse ToResponse(Activity activity) => new()
    {
        Id = activity.Id,
        UserId = activity.UserId,
        DateTime = activity.DateTime,
        Sport = activity.Sport,
        Steps = activity.Steps,
        Distance = activity.Distance,
        Duration = activity.Duration,
        Points = activity.Points
    };
}
