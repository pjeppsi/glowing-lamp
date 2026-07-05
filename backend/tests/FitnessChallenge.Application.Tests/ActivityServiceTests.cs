using FitnessChallenge.Application.Services;
using FitnessChallenge.Domain.Entities;
using FitnessChallenge.Domain.Interfaces;

namespace FitnessChallenge.Application.Tests;

public class ActivityServiceTests
{
    private static User MakeUser(string firstName, string lastName) => new()
    {
        Id = Guid.NewGuid(),
        FirstName = firstName,
        LastName = lastName,
        NormalizedFullName = User.Normalize(firstName, lastName)
    };

    [Fact]
    public async Task GetLeaderboardAsync_TiedUsers_ShareTheSameRank()
    {
        var alice = MakeUser("Alice", "Anderson");
        var bob = MakeUser("Bob", "Baker");
        var carol = MakeUser("Carol", "Clark");

        var users = new FakeUserRepository(alice, bob, carol);
        var activities = new FakeActivityRepository(
            (alice.Id, 100),
            (bob.Id, 100),
            (carol.Id, 50));

        var service = new ActivityService(activities, users, new ScoringService());

        var (leaderboard, _) = await service.GetLeaderboardAsync();

        Assert.Equal(1, leaderboard.Single(e => e.UserId == alice.Id).Rank);
        Assert.Equal(1, leaderboard.Single(e => e.UserId == bob.Id).Rank);
        Assert.Equal(2, leaderboard.Single(e => e.UserId == carol.Id).Rank);
    }

    [Fact]
    public async Task GetLeaderboardAsync_NoTies_RanksSequentially()
    {
        var alice = MakeUser("Alice", "Anderson");
        var bob = MakeUser("Bob", "Baker");
        var carol = MakeUser("Carol", "Clark");

        var users = new FakeUserRepository(alice, bob, carol);
        var activities = new FakeActivityRepository(
            (alice.Id, 300),
            (bob.Id, 200),
            (carol.Id, 100));

        var service = new ActivityService(activities, users, new ScoringService());

        var (leaderboard, _) = await service.GetLeaderboardAsync();

        Assert.Equal(1, leaderboard.Single(e => e.UserId == alice.Id).Rank);
        Assert.Equal(2, leaderboard.Single(e => e.UserId == bob.Id).Rank);
        Assert.Equal(3, leaderboard.Single(e => e.UserId == carol.Id).Rank);
    }

    [Fact]
    public async Task GetLeaderboardAsync_PageSizeSmallerThanTotal_ReturnsRequestedPageAndFullTotalCount()
    {
        var alice = MakeUser("Alice", "Anderson");
        var bob = MakeUser("Bob", "Baker");
        var carol = MakeUser("Carol", "Clark");

        var users = new FakeUserRepository(alice, bob, carol);
        var activities = new FakeActivityRepository(
            (alice.Id, 300),
            (bob.Id, 200),
            (carol.Id, 100));

        var service = new ActivityService(activities, users, new ScoringService());

        var (firstPage, totalCount) = await service.GetLeaderboardAsync(page: 1, pageSize: 2);
        Assert.Equal(3, totalCount);
        Assert.Equal(2, firstPage.Count);
        Assert.Equal(alice.Id, firstPage[0].UserId);
        Assert.Equal(bob.Id, firstPage[1].UserId);

        var (secondPage, _) = await service.GetLeaderboardAsync(page: 2, pageSize: 2);
        Assert.Single(secondPage);
        Assert.Equal(carol.Id, secondPage[0].UserId);
    }

    [Fact]
    public async Task GetLeaderboardAsync_AllTimeWindow_TrendIsDash()
    {
        var alice = MakeUser("Alice", "Anderson");
        var users = new FakeUserRepository(alice);
        var activities = new HistoryFakeActivityRepository((alice.Id, 100, DateTime.UtcNow));

        var service = new ActivityService(activities, users, new ScoringService());

        var (leaderboard, _) = await service.GetLeaderboardAsync(LeaderboardWindow.AllTime);

        Assert.Equal("-", leaderboard.Single(e => e.UserId == alice.Id).Trend);
    }

    [Fact]
    public async Task GetLeaderboardAsync_NoActivityBeforeCutoff_TrendIsNew()
    {
        var alice = MakeUser("Alice", "Anderson");
        var users = new FakeUserRepository(alice);
        // Only activity is "now" — nothing before today's cutoff.
        var activities = new HistoryFakeActivityRepository((alice.Id, 100, DateTime.UtcNow));

        var service = new ActivityService(activities, users, new ScoringService());

        var (leaderboard, _) = await service.GetLeaderboardAsync(LeaderboardWindow.Today);

        Assert.Equal("new", leaderboard.Single(e => e.UserId == alice.Id).Trend);
    }

    [Fact]
    public async Task GetLeaderboardAsync_RankImproves_TrendIsUp()
    {
        var alice = MakeUser("Alice", "Anderson");
        var bob = MakeUser("Bob", "Baker");
        var users = new FakeUserRepository(alice, bob);

        var longAgo = DateTime.UtcNow.AddYears(-1);
        var activities = new HistoryFakeActivityRepository(
            // Before this week's cutoff: Bob (100) ranked above Alice (50).
            (alice.Id, 50, longAgo),
            (bob.Id, 100, longAgo),
            // This week: Alice earns enough to overtake Bob.
            (alice.Id, 100, DateTime.UtcNow));

        var service = new ActivityService(activities, users, new ScoringService());

        var (leaderboard, _) = await service.GetLeaderboardAsync(LeaderboardWindow.Week);

        Assert.Equal("up", leaderboard.Single(e => e.UserId == alice.Id).Trend);
        Assert.Equal("down", leaderboard.Single(e => e.UserId == bob.Id).Trend);
    }

    private sealed class FakeUserRepository(params User[] users) : IUserRepository
    {
        public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
            Task.FromResult(users.SingleOrDefault(u => u.Id == id));

        public Task<bool> ExistsByNormalizedFullNameAsync(string normalizedFullName, CancellationToken cancellationToken = default) =>
            Task.FromResult(users.Any(u => u.NormalizedFullName == normalizedFullName));

        public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
            Task.FromResult(users.Any(u => u.Id == id));

        public Task AddAsync(User user, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<User>>(users.ToList());
    }

    private sealed class FakeActivityRepository : IActivityRepository
    {
        private readonly IReadOnlyList<UserPointsSummary> _summaries;

        public FakeActivityRepository(params (Guid UserId, int TotalPoints)[] summaries)
        {
            _summaries = summaries.Select(s => new UserPointsSummary(s.UserId, s.TotalPoints)).ToList();
        }

        public Task AddAsync(Activity activity, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<Activity>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<(IReadOnlyList<Activity> Items, int TotalCount)> GetByUserIdPagedAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        // These tests only exercise the default AllTime window (before: null), so
        // there's no per-activity date to filter a "before" cutoff against here.
        public Task<IReadOnlyList<UserPointsSummary>> GetLeaderboardAsync(DateTime? before = null, CancellationToken cancellationToken = default) =>
            Task.FromResult(_summaries);
    }

    private sealed class HistoryFakeActivityRepository : IActivityRepository
    {
        private readonly IReadOnlyList<(Guid UserId, int Points, DateTime DateTime)> _activities;

        public HistoryFakeActivityRepository(params (Guid UserId, int Points, DateTime DateTime)[] activities)
        {
            _activities = activities;
        }

        public Task AddAsync(Activity activity, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<Activity>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<(IReadOnlyList<Activity> Items, int TotalCount)> GetByUserIdPagedAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<UserPointsSummary>> GetLeaderboardAsync(DateTime? before = null, CancellationToken cancellationToken = default)
        {
            var filtered = before is null ? _activities : _activities.Where(a => a.DateTime < before.Value);
            var summaries = filtered
                .GroupBy(a => a.UserId)
                .Select(g => new UserPointsSummary(g.Key, g.Sum(a => a.Points)))
                .ToList();
            return Task.FromResult<IReadOnlyList<UserPointsSummary>>(summaries);
        }
    }
}
