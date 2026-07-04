using FitnessChallenge.Application.DTOs;

namespace FitnessChallenge.Application.Services;

public interface IActivityService
{
    Task<ActivityResponse> AddActivityAsync(ActivityIngestRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ActivityResponse>> GetActivitiesByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<LeaderboardEntryResponse>> GetLeaderboardAsync(CancellationToken cancellationToken = default);
}
