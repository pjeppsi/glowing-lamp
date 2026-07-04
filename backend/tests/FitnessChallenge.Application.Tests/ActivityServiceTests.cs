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

        var leaderboard = await service.GetLeaderboardAsync();

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

        var leaderboard = await service.GetLeaderboardAsync();

        Assert.Equal(1, leaderboard.Single(e => e.UserId == alice.Id).Rank);
        Assert.Equal(2, leaderboard.Single(e => e.UserId == bob.Id).Rank);
        Assert.Equal(3, leaderboard.Single(e => e.UserId == carol.Id).Rank);
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

        public Task<IReadOnlyList<UserPointsSummary>> GetLeaderboardAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(_summaries);
    }
}
