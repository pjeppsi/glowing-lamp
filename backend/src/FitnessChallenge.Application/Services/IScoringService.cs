using FitnessChallenge.Domain.Enums;

namespace FitnessChallenge.Application.Services;

public record ActivityInput(Sport? Sport, int? Steps, decimal? Distance, string? Duration);

public interface IScoringService
{
    int CalculatePoints(ActivityInput input);
}
