using FitnessChallenge.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FitnessChallenge.Infrastructure.Persistence.Configurations;

public class ActivityConfiguration : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder.HasKey(a => a.Id);

        // Stored as the string name ("running"), not the EF Core default int
        // ordinal — keeps the data readable and immune to enum reordering.
        builder.Property(a => a.Sport).HasConversion<string>();

        builder.Property(a => a.Points).IsRequired();

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // App-level validation (FluentValidation) is the primary defense and
        // runs before the service is ever called; this constraint is a
        // defense-in-depth safety net that should never trigger in normal use.
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Activity_ExactlyOneMetric",
            "(Distance IS NOT NULL AND Duration IS NULL AND Steps IS NULL) OR " +
            "(Distance IS NULL AND Duration IS NOT NULL AND Steps IS NULL) OR " +
            "(Distance IS NULL AND Duration IS NULL AND Steps IS NOT NULL)"));
    }
}
