using FitnessChallenge.Domain.Enums;

namespace FitnessChallenge.Domain.Entities;

// Flat entity (no TPH): Steps/Distance/Duration are nullable and exactly one
// is populated per row depending on Sport, enforced by validation (app-level)
// and a DB check constraint (safety net) — see Infrastructure configuration.
public class Activity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime DateTime { get; set; }
    public Sport? Sport { get; set; }
    public int? Steps { get; set; }
    public decimal? Distance { get; set; }

    // Stored literally as "mm:ss" (not converted to total seconds) per the
    // task's own format; ScoringService parses it once, at insert time.
    public string? Duration { get; set; }

    // Calculated once at insert time (write-time), never recomputed on read.
    public int Points { get; set; }
}
