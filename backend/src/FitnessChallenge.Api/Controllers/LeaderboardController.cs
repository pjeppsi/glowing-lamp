using FitnessChallenge.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace FitnessChallenge.Api.Controllers;

[ApiController]
[Route("api/leaderboard")]
public class LeaderboardController : ControllerBase
{
    private readonly IActivityService _activityService;

    public LeaderboardController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var leaderboard = await _activityService.GetLeaderboardAsync(cancellationToken);
        return Ok(leaderboard);
    }
}
