using FitnessChallenge.Application.DTOs;
using FitnessChallenge.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace FitnessChallenge.Api.Controllers;

[ApiController]
[Route("api/leaderboard")]
public class LeaderboardController : ControllerBase
{
    // 500 comfortably covers "give me the whole roster" (e.g. populating the
    // compare-users picker) without allowing literally unbounded requests.
    private const int MaxPageSize = 500;

    private readonly IActivityService _activityService;

    public LeaderboardController(IActivityService activityService)
    {
        _activityService = activityService;
    }

    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Get(
        [FromQuery] string? window,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseWindow(window, out var parsedWindow))
        {
            return BadRequest($"Invalid window '{window}'. Expected one of: today, week, month, allTime.");
        }

        if (page < 1 || pageSize is < 1 or > MaxPageSize)
        {
            return BadRequest($"page must be >= 1 and pageSize must be between 1 and {MaxPageSize}.");
        }

        var (entries, totalCount) = await _activityService.GetLeaderboardAsync(parsedWindow, page, pageSize, cancellationToken);
        return Ok(new LeaderboardResponse
        {
            Window = ToWindowString(parsedWindow),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            Entries = entries
        });
    }

    private static bool TryParseWindow(string? window, out LeaderboardWindow parsed)
    {
        if (string.IsNullOrWhiteSpace(window))
        {
            parsed = LeaderboardWindow.AllTime;
            return true;
        }

        return Enum.TryParse(window, ignoreCase: true, out parsed) && Enum.IsDefined(parsed);
    }

    private static string ToWindowString(LeaderboardWindow window) => window switch
    {
        LeaderboardWindow.Today => "today",
        LeaderboardWindow.Week => "week",
        LeaderboardWindow.Month => "month",
        LeaderboardWindow.AllTime => "allTime",
        _ => throw new ArgumentOutOfRangeException(nameof(window))
    };
}
