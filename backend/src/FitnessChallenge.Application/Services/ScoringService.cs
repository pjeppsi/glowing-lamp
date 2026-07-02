using FitnessChallenge.Domain.Enums;

namespace FitnessChallenge.Application.Services;

// Pure Application-layer service: no DbContext/HTTP dependency, unit-testable
// in isolation. Called exactly once, at insert time — the result is persisted
// on Activity.Points and never recomputed on read, so a future formula change
// does not retroactively alter historical points.
//
// Floor order is NOT uniform across metric types (this is intentional, see
// the spec): distance floors AFTER multiplying by the rate, while duration
// and steps floor BEFORE multiplying/dividing. Getting this backwards is the
// classic bug here, e.g. 1:55 gym (1.9167 min) must floor to 1 minute first
// (1 * 5 = 5), not floor(1.9167 * 5) = 9.
public class ScoringService : IScoringService
{
    public int CalculatePoints(ActivityInput input)
    {
        return input.Sport switch
        {
            Sport.Running => (int)Math.Floor(input.Distance!.Value * 100m),
            Sport.Walking => (int)Math.Floor(input.Distance!.Value * 50m),
            Sport.Cycling => (int)Math.Floor(input.Distance!.Value * 25m),
            Sport.Swimming => (int)(Math.Floor(ParseMinutes(input.Duration!)) * 15m),
            Sport.Gym => (int)(Math.Floor(ParseMinutes(input.Duration!)) * 5m),
            null => (int)(Math.Floor(input.Steps!.Value / 100m) * 1m),
            _ => throw new ArgumentOutOfRangeException(nameof(input), input.Sport, "Unsupported sport.")
        };
    }

    private static decimal ParseMinutes(string duration)
    {
        var parts = duration.Split(':');
        var minutes = int.Parse(parts[0]);
        var seconds = int.Parse(parts[1]);
        return minutes + seconds / 60m;
    }
}
