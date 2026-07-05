using FitnessChallenge.Domain.Entities;
using FitnessChallenge.Domain.Interfaces;
using FitnessChallenge.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FitnessChallenge.Infrastructure.Repositories;

public class ActivityRepository : IActivityRepository
{
    private readonly AppDbContext _context;

    public ActivityRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Activity activity, CancellationToken cancellationToken = default)
    {
        _context.Activities.Add(activity);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Activity>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _context.Activities
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.DateTime)
            .ToListAsync(cancellationToken);

    public async Task<(IReadOnlyList<Activity> Items, int TotalCount)> GetByUserIdPagedAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Activities.AsNoTracking().Where(a => a.UserId == userId);

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(a => a.DateTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    // Live aggregation straight from Activity — User has no denormalized
    // TotalPoints column, so this runs a fresh SUM/GROUP BY on every call.
    public async Task<IReadOnlyList<UserPointsSummary>> GetLeaderboardAsync(DateTime? before = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Activities.AsNoTracking().AsQueryable();
        if (before is not null)
        {
            query = query.Where(a => a.DateTime < before.Value);
        }

        return await query
            .GroupBy(a => a.UserId)
            .Select(g => new UserPointsSummary(g.Key, g.Sum(a => a.Points)))
            .ToListAsync(cancellationToken);
    }
}
