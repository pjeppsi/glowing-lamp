namespace FitnessChallenge.Application.DTOs;

public class LeaderboardResponse
{
    public string Window { get; set; } = string.Empty;
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public IReadOnlyList<LeaderboardEntryResponse> Entries { get; set; } = Array.Empty<LeaderboardEntryResponse>();
}
