using FitnessChallenge.Application.Services;
using FitnessChallenge.Application.Validators;
using FitnessChallenge.Domain.Interfaces;
using FitnessChallenge.Infrastructure.Persistence;
using FitnessChallenge.Infrastructure.Repositories;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FitnessChallenge.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");

        services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IActivityRepository, ActivityRepository>();

        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddSingleton<IScoringService, ScoringService>();

        services.AddValidatorsFromAssemblyContaining<RegisterUserRequestValidator>();

        return services;
    }
}
