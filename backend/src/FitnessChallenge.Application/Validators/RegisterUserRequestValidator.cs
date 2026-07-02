using FitnessChallenge.Application.DTOs;
using FitnessChallenge.Domain.Entities;
using FitnessChallenge.Domain.Interfaces;
using FluentValidation;

namespace FitnessChallenge.Application.Validators;

public class RegisterUserRequestValidator : AbstractValidator<RegisterUserRequest>
{
    private readonly IUserRepository _userRepository;

    public RegisterUserRequestValidator(IUserRepository userRepository)
    {
        _userRepository = userRepository;

        RuleFor(x => x.FirstName).NotEmpty();
        RuleFor(x => x.LastName).NotEmpty();

        RuleFor(x => x)
            .MustAsync(BeUniqueNameAsync)
            .WithMessage("A user with this first and last name already exists.")
            .WithName("FullName")
            .When(x => !string.IsNullOrWhiteSpace(x.FirstName) && !string.IsNullOrWhiteSpace(x.LastName));
    }

    private async Task<bool> BeUniqueNameAsync(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var normalized = User.Normalize(request.FirstName, request.LastName);
        return !await _userRepository.ExistsByNormalizedFullNameAsync(normalized, cancellationToken);
    }
}
