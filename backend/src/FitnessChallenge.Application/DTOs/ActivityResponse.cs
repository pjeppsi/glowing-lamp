using FitnessChallenge.Domain.Enums;

namespace FitnessChallenge.Application.DTOs;

public class ActivityResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime DateTime { get; set; }
    public Sport? Sport { get; set; }
    public int? Steps { get; set; }
    public decimal? Distance { get; set; }
    public string? Duration { get; set; }
    public int Points { get; set; }
}
