using System.Globalization;
using FitnessChallenge.Application.DTOs;
using FitnessChallenge.Domain.Interfaces;
using FluentValidation;
using Sport = FitnessChallenge.Domain.Enums.Sport;

namespace FitnessChallenge.Application.Validators;

public class ActivityIngestRequestValidator : AbstractValidator<ActivityIngestRequest>
{
    private static readonly string[] DistanceSports = ["running", "walking", "cycling"];
    private static readonly string[] DurationSports = ["gym", "swimming"];

    private readonly IUserRepository _userRepository;

    public ActivityIngestRequestValidator(IUserRepository userRepository)
    {
        _userRepository = userRepository;

        RuleFor(x => x.UserId)
            .NotEmpty()
            .Must(id => Guid.TryParse(id, out _))
            .WithMessage("userId must be a valid GUID.");

        RuleFor(x => x.UserId)
            .MustAsync(ExistAsync)
            .WithMessage("userId does not refer to an existing user.")
            .When(x => Guid.TryParse(x.UserId, out _));

        RuleFor(x => x.DateTime)
            .NotEmpty()
            .Must(BeValidIso8601)
            .WithMessage("datetime must be a valid ISO 8601 string.");

        RuleFor(x => x.Sport)
            .Must(BeAKnownSport)
            .WithMessage($"sport must be one of: {string.Join(", ", DistanceSports.Concat(DurationSports))}.")
            .When(x => x.Sport is not null);

        RuleFor(x => x)
            .Must(HaveExactlyOneMetricMatchingSport)
            .WithMessage(
                "Exactly one of distance/duration/steps must be present, matching the sport: " +
                "distance for running/walking/cycling, duration for gym/swimming, steps when sport is absent.")
            .WithName("Metric")
            .When(x => x.Sport is null || BeAKnownSport(x.Sport));

        RuleFor(x => x.Distance)
            .GreaterThan(0)
            .WithMessage("distance must be greater than 0.")
            .When(x => x.Sport is not null && DistanceSports.Contains(x.Sport, StringComparer.OrdinalIgnoreCase) && x.Distance is not null);

        RuleFor(x => x.Steps)
            .GreaterThan(0)
            .WithMessage("steps must be greater than 0.")
            .When(x => x.Sport is null && x.Steps is not null);

        RuleFor(x => x.Duration)
            .Must(BeValidMinutesSeconds)
            .WithMessage("duration must be in \"mm:ss\" format with non-negative integers and seconds 0-59.")
            .When(x => x.Sport is not null && DurationSports.Contains(x.Sport, StringComparer.OrdinalIgnoreCase) && x.Duration is not null);
    }

    private async Task<bool> ExistAsync(string userId, CancellationToken cancellationToken)
    {
        var id = Guid.Parse(userId);
        return await _userRepository.ExistsAsync(id, cancellationToken);
    }

    private static bool BeValidIso8601(string value) =>
        DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _);

    private static bool BeAKnownSport(string? sport) =>
        sport is not null && Enum.TryParse<Sport>(sport, ignoreCase: true, out _);

    private static bool HaveExactlyOneMetricMatchingSport(ActivityIngestRequest request)
    {
        var populatedCount = new[] { request.Distance is not null, request.Duration is not null, request.Steps is not null }
            .Count(present => present);

        if (populatedCount != 1)
        {
            return false;
        }

        if (request.Sport is not null && DistanceSports.Contains(request.Sport, StringComparer.OrdinalIgnoreCase))
        {
            return request.Distance is not null;
        }

        if (request.Sport is not null && DurationSports.Contains(request.Sport, StringComparer.OrdinalIgnoreCase))
        {
            return request.Duration is not null;
        }

        // Sport absent => Daily Steps.
        return request.Sport is null && request.Steps is not null;
    }

    private static bool BeValidMinutesSeconds(string? duration)
    {
        if (duration is null)
        {
            return false;
        }

        var parts = duration.Split(':');
        if (parts.Length != 2)
        {
            return false;
        }

        if (!int.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var minutes) ||
            !int.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var seconds))
        {
            return false;
        }

        return minutes >= 0 && seconds is >= 0 and <= 59;
    }
}
