using FitnessChallenge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FitnessChallenge.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);

        builder.Property(u => u.FirstName).IsRequired();
        builder.Property(u => u.LastName).IsRequired();
        builder.Property(u => u.NormalizedFullName).IsRequired();

        // Case/Unicode-safe uniqueness enforced on the C#-computed column,
        // not on SQLite's ASCII-only NOCASE collation. See User.Normalize.
        builder.HasIndex(u => u.NormalizedFullName).IsUnique();
    }
}
