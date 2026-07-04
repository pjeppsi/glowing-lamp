namespace FitnessChallenge.Application.DTOs;

public class ActivityIngestRequest
{
    public string UserId { get; set; } = string.Empty;
    public string DateTime { get; set; } = string.Empty;

    // Kept as a plain string (not the Sport enum) so an invalid value fails
    // through FluentValidation into the unified 400 response, rather than
    // through model-binding enum conversion with a different error shape.
    public string? Sport { get; set; }
    public int? Steps { get; set; }
    public decimal? Distance { get; set; }
    public string? Duration { get; set; }
}
