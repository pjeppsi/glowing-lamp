using FitnessChallenge.Application.DTOs;
using FitnessChallenge.Application.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace FitnessChallenge.Api.Controllers;

[ApiController]
[Route("api/activities")]
public class ActivitiesController : ControllerBase
{
    private readonly IActivityService _activityService;
    private readonly IValidator<ActivityIngestRequest> _validator;

    public ActivitiesController(IActivityService activityService, IValidator<ActivityIngestRequest> validator)
    {
        _activityService = activityService;
        _validator = validator;
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Ingest(ActivityIngestRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            validationResult.AddToModelState(ModelState);
            return ValidationProblem(ModelState);
        }

        var activity = await _activityService.AddActivityAsync(request, cancellationToken);
        return CreatedAtAction(
            nameof(UsersController.GetActivities),
            "Users",
            new { id = activity.UserId },
            activity);
    }
}
