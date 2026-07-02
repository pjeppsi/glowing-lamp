namespace FitnessChallenge.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }

    // Case/Unicode-safe uniqueness key, computed in C# (SQLite's built-in NOCASE
    // collation only case-folds ASCII, e.g. it would not equate "Perić"/"PERIĆ").
    public required string NormalizedFullName { get; set; }

    public static string Normalize(string firstName, string lastName) =>
        $"{firstName.Trim()} {lastName.Trim()}".ToUpperInvariant();
}
