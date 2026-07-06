using FitnessChallenge.Application.DTOs;

namespace FitnessChallenge.Application.Services;

public interface IActivityService
{
    Task<ActivityResponse> AddActivityAsync(ActivityIngestRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ActivityResponse>> GetActivitiesByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<ActivityResponse> Items, int TotalCount)> GetActivitiesByUserIdPagedAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<LeaderboardEntryResponse> Entries, int TotalCount)> GetLeaderboardAsync(
        LeaderboardWindow window = LeaderboardWindow.AllTime,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);
}
