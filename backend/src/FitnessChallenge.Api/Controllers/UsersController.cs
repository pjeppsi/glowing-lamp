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

    private const int MaxActivitiesPageSize = 100;

    // Dual response shape, chosen deliberately: dashboard charts/stat cards need
    // the user's ENTIRE activity history to aggregate correctly (monthly totals,
    // sport breakdown, heatmap) and call this with no page/pageSize — that path
    // is unchanged and still returns the bare array. The browsable activity
    // history table instead passes page/pageSize and gets back a paginated
    // envelope with TotalCount, backed by a real Skip/Take in the DB.
    [HttpGet("{id:guid}/activities")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetActivities(
        Guid id,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken)
    {
        var user = await _userService.GetByIdAsync(id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        if (page is null && pageSize is null)
        {
            var activities = await _activityService.GetActivitiesByUserIdAsync(id, cancellationToken);
            return Ok(activities);
        }

        var resolvedPage = page ?? 1;
        var resolvedPageSize = pageSize ?? 10;
        if (resolvedPage < 1 || resolvedPageSize is < 1 or > MaxActivitiesPageSize)
        {
            return BadRequest($"page must be >= 1 and pageSize must be between 1 and {MaxActivitiesPageSize}.");
        }

        var (items, totalCount) = await _activityService.GetActivitiesByUserIdPagedAsync(id, resolvedPage, resolvedPageSize, cancellationToken);
        return Ok(new ActivitiesPageResponse
        {
            Page = resolvedPage,
            PageSize = resolvedPageSize,
            TotalCount = totalCount,
            Items = items
        });
    }
}
