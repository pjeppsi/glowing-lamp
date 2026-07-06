using FitnessChallenge.Domain.Entities;

namespace FitnessChallenge.Domain.Interfaces;

public interface IActivityRepository
{
    Task AddAsync(Activity activity, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Activity>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    // Skip/Take + Count run in the DB (two queries) — only the requested page of
    // rows is ever materialized into memory, ordered newest-first like the unpaged
    // method above.
    Task<(IReadOnlyList<Activity> Items, int TotalCount)> GetByUserIdPagedAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    // Live aggregation (SUM(Points) GROUP BY UserId) — User has no denormalized
    // TotalPoints field, so this reads straight from Activity on every call.
    // "before" restricts the sum to activities strictly before that instant (used
    // to compute a prior-period snapshot for leaderboard trend); null sums everything.
    // Users with zero matching activities are simply absent from the result — callers
    // rely on that to distinguish "no activity yet" from "activity totalling zero points".
    Task<IReadOnlyList<UserPointsSummary>> GetLeaderboardAsync(DateTime? before = null, CancellationToken cancellationToken = default);
}

public record UserPointsSummary(Guid UserId, int TotalPoints);
