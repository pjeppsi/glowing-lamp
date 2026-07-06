namespace FitnessChallenge.Application.DTOs;

public class LeaderboardEntryResponse
{
    public int Rank { get; set; }
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int TotalPoints { get; set; }

    // "up" | "down" | "same" | "new" | "-". "-" only when the requested window is
    // AllTime, where there is no prior period to compare against.
    public string Trend { get; set; } = string.Empty;
}
