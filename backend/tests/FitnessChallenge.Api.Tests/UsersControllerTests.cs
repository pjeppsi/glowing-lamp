using System.Net;
using System.Net.Http.Json;
using FitnessChallenge.Application.DTOs;
using Xunit;

namespace FitnessChallenge.Api.Tests;

public class UsersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public UsersControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_ValidRequest_Returns201WithId()
    {
        var response = await _client.PostAsJsonAsync("/api/users", new RegisterUserRequest
        {
            FirstName = "Ivan",
            LastName = "Horvat"
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, Guid>>();
        Assert.NotEqual(Guid.Empty, body!["id"]);
    }

    [Fact]
    public async Task Register_DuplicateNameDifferentCase_Returns400()
    {
        await _client.PostAsJsonAsync("/api/users", new RegisterUserRequest { FirstName = "Marko", LastName = "Novak" });

        var response = await _client.PostAsJsonAsync("/api/users", new RegisterUserRequest { FirstName = "MARKO", LastName = "novak" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetById_ExistingUser_Returns200()
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/users", new RegisterUserRequest { FirstName = "Petra", LastName = "Kovac" });
        var registered = await registerResponse.Content.ReadFromJsonAsync<Dictionary<string, Guid>>();
        var id = registered!["id"];

        var response = await _client.GetAsync($"/api/users/{id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<UserResponse>();
        Assert.Equal("Petra", user!.FirstName);
    }

    [Fact]
    public async Task GetById_NonExistingUser_Returns404NotBadRequest()
    {
        var response = await _client.GetAsync($"/api/users/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
