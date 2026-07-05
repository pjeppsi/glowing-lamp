namespace FitnessChallenge.Application.DTOs;

public class ActivitiesPageResponse
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public IReadOnlyList<ActivityResponse> Items { get; set; } = Array.Empty<ActivityResponse>();
}
