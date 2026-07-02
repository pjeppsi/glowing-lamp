using FitnessChallenge.Domain.Entities;
using FitnessChallenge.Domain.Interfaces;
using FitnessChallenge.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FitnessChallenge.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context)
    {
        _context = context;
    }

    public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.Users.SingleOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<bool> ExistsByNormalizedFullNameAsync(string normalizedFullName, CancellationToken cancellationToken = default) =>
        _context.Users.AnyAsync(u => u.NormalizedFullName == normalizedFullName, cancellationToken);

    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
        _context.Users.AnyAsync(u => u.Id == id, cancellationToken);

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await _context.Users.AsNoTracking().ToListAsync(cancellationToken);
}
