namespace FitnessChallenge.Application.DTOs;

// Ranking trend mechanism is TBD (not yet defined in the spec) and is
// intentionally omitted here — see README assumptions.
public class LeaderboardEntryResponse
{
    public int Rank { get; set; }
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int TotalPoints { get; set; }
}
