using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FitnessChallenge.Application.DTOs;
using Xunit;

namespace FitnessChallenge.Api.Tests;

public class ActivitiesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    // Mirrors the JsonStringEnumConverter registered server-side in Program.cs;
    // System.Net.Http.Json's default options don't know about it otherwise.
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private readonly HttpClient _client;

    public ActivitiesControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<Guid> RegisterUserAsync(string firstName, string lastName)
    {
        var response = await _client.PostAsJsonAsync("/api/users", new RegisterUserRequest { FirstName = firstName, LastName = lastName });
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, Guid>>();
        return body!["id"];
    }

    [Fact]
    public async Task Ingest_ValidRunningActivity_Returns201WithComputedPoints()
    {
        var userId = await RegisterUserAsync("Luka", "Babic");

        var response = await _client.PostAsJsonAsync("/api/activities", new ActivityIngestRequest
        {
            UserId = userId.ToString(),
            DateTime = "2026-06-30T10:30:00Z",
            Sport = "running",
            Distance = 42.195m
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var activity = await response.Content.ReadFromJsonAsync<ActivityResponse>(JsonOptions);
        Assert.Equal(4219, activity!.Points);
    }

    [Fact]
    public async Task Ingest_SwimmingWithDistanceInsteadOfDuration_Returns400()
    {
        // This is the exact "invalid" example from the task spec.
        var userId = await RegisterUserAsync("Ivana", "Peric");

        var response = await _client.PostAsJsonAsync("/api/activities", new ActivityIngestRequest
        {
            UserId = userId.ToString(),
            DateTime = "2026-06-30T10:30:00Z",
            Sport = "swimming",
            Distance = 42.195m
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ingest_BothDistanceAndStepsPresent_Returns400()
    {
        var userId = await RegisterUserAsync("Tomislav", "Juric");

        var response = await _client.PostAsJsonAsync("/api/activities", new ActivityIngestRequest
        {
            UserId = userId.ToString(),
            DateTime = "2026-06-30T10:30:00Z",
            Steps = 100,
            Distance = 1
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ingest_UnknownUserId_Returns400NotServerError()
    {
        var response = await _client.PostAsJsonAsync("/api/activities", new ActivityIngestRequest
        {
            UserId = Guid.NewGuid().ToString(),
            DateTime = "2026-06-30T10:30:00Z",
            Steps = 100
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Ingest_ClientSuppliedPointsField_IsIgnored()
    {
        // The ingest schema has no "points" field at all; this asserts the raw
        // JSON payload cannot smuggle one in and influence the stored score.
        var userId = await RegisterUserAsync("Dario", "Matic");

        var response = await _client.PostAsync("/api/activities", JsonContent.Create(new
        {
            userId = userId.ToString(),
            datetime = "2026-06-30T10:30:00Z",
            sport = "running",
            distance = 1.0m,
            points = 999999
        }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var activity = await response.Content.ReadFromJsonAsync<ActivityResponse>(JsonOptions);
        Assert.Equal(100, activity!.Points);
    }

    [Fact]
    public async Task Leaderboard_ReflectsLiveAggregationAcrossActivities()
    {
        var userId = await RegisterUserAsync("Leaderboard", "Tester");

        await _client.PostAsJsonAsync("/api/activities", new ActivityIngestRequest
        {
            UserId = userId.ToString(),
            DateTime = "2026-06-30T10:30:00Z",
            Steps = 550
        });
        await _client.PostAsJsonAsync("/api/activities", new ActivityIngestRequest
        {
            UserId = userId.ToString(),
            DateTime = "2026-06-30T11:30:00Z",
            Steps = 600
        });

        var response = await _client.GetAsync("/api/leaderboard");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var leaderboard = await response.Content.ReadFromJsonAsync<LeaderboardResponse>(JsonOptions);
        var entry = leaderboard!.Entries.Single(e => e.UserId == userId);

        // floor(550->500)=5 + floor(600->600)=6 = 11, per-record flooring.
        Assert.Equal(11, entry.TotalPoints);
    }
}
