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

    public async Task<IReadOnlyList<LeaderboardEntryResponse>> GetLeaderboardAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllAsync(cancellationToken);
        var summaries = await _activityRepository.GetLeaderboardAsync(cancellationToken);
        var pointsByUserId = summaries.ToDictionary(s => s.UserId, s => s.TotalPoints);

        return users
            .Select(u => new
            {
                User = u,
                TotalPoints = pointsByUserId.GetValueOrDefault(u.Id, 0)
            })
            .OrderByDescending(x => x.TotalPoints)
            .Select((x, index) => new LeaderboardEntryResponse
            {
                Rank = index + 1,
                UserId = x.User.Id,
                FirstName = x.User.FirstName,
                LastName = x.User.LastName,
                TotalPoints = x.TotalPoints
            })
            .ToList();
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
