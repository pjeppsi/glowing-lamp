using FitnessChallenge.Application.DTOs;
using FitnessChallenge.Application.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace FitnessChallenge.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IActivityService _activityService;
    private readonly IValidator<RegisterUserRequest> _validator;

    public UsersController(IUserService userService, IActivityService activityService, IValidator<RegisterUserRequest> validator)
    {
        _userService = userService;
        _activityService = activityService;
        _validator = validator;
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register(RegisterUserRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            validationResult.AddToModelState(ModelState);
            return ValidationProblem(ModelState);
        }

        var user = await _userService.RegisterAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new { id = user.Id });
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpGet("{id:guid}/activities")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActivities(Guid id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        var activities = await _activityService.GetActivitiesByUserIdAsync(id, cancellationToken);
        return Ok(activities);
    }
}
