using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FitnessChallenge.Infrastructure.Persistence;

// Lets `dotnet ef migrations add` construct the DbContext at design time,
// without needing the Api project's DI container wired up.
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlite("Data Source=fitnesschallenge.db");

        return new AppDbContext(optionsBuilder.Options);
    }
}
