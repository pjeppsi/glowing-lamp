using FitnessChallenge.Domain.Entities;

namespace FitnessChallenge.Domain.Interfaces;

public interface IActivityRepository
{
    Task AddAsync(Activity activity, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Activity>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    // Live aggregation (SUM(Points) GROUP BY UserId) — User has no denormalized
    // TotalPoints field, so this reads straight from Activity on every call.
    Task<IReadOnlyList<UserPointsSummary>> GetLeaderboardAsync(CancellationToken cancellationToken = default);
}

public record UserPointsSummary(Guid UserId, int TotalPoints);
