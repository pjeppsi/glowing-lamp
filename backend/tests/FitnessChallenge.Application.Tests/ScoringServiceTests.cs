using FitnessChallenge.Application.Services;
using FitnessChallenge.Domain.Enums;
using Xunit;

namespace FitnessChallenge.Application.Tests;

public class ScoringServiceTests
{
    private readonly ScoringService _sut = new();

    [Fact]
    public void Walking_1_55Km_FloorsAfterMultiplying_To77Points()
    {
        var input = new ActivityInput(Sport.Walking, null, 1.55m, null);

        Assert.Equal(77, _sut.CalculatePoints(input));
    }

    [Fact]
    public void Gym_1Min55Sec_FloorsBeforeMultiplying_To5Points()
    {
        var input = new ActivityInput(Sport.Gym, null, null, "1:55");

        Assert.Equal(5, _sut.CalculatePoints(input));
    }

    [Fact]
    public void DailySteps_399_FloorsToNearestHundred_To3Points()
    {
        var input = new ActivityInput(null, 399, null, null);

        Assert.Equal(3, _sut.CalculatePoints(input));
    }

    [Fact]
    public void Running_42_195Km_MarathonDistance_To4219Points()
    {
        var input = new ActivityInput(Sport.Running, null, 42.195m, null);

        Assert.Equal(4219, _sut.CalculatePoints(input));
    }

    [Fact]
    public void Swimming_0Min59Sec_FloorsToZeroMinutes_To0Points()
    {
        var input = new ActivityInput(Sport.Swimming, null, null, "0:59");

        Assert.Equal(0, _sut.CalculatePoints(input));
    }

    [Fact]
    public void DailySteps_ExactHundred_To1Point()
    {
        var input = new ActivityInput(null, 100, null, null);

        Assert.Equal(1, _sut.CalculatePoints(input));
    }

    [Fact]
    public void DailySteps_99_BelowThreshold_To0Points()
    {
        var input = new ActivityInput(null, 99, null, null);

        Assert.Equal(0, _sut.CalculatePoints(input));
    }

    // Regression guard for the decimal-vs-double precision trap: 1.55 in
    // double arithmetic can surface as 77.49999999999999 after *50, which
    // would floor to 76 instead of the correct 77.
    [Fact]
    public void Walking_1_55Km_UsesExactDecimalArithmetic_NotDoubleImprecision()
    {
        var input = new ActivityInput(Sport.Walking, null, 1.55m, null);

        var points = _sut.CalculatePoints(input);

        Assert.Equal(77, points);
        Assert.NotEqual(76, points);
    }

    [Theory]
    [InlineData(1.0, 100)]
    [InlineData(0.5, 50)]
    public void Running_VariousDistances_FloorAfterMultiplying(decimal km, int expectedPoints)
    {
        var input = new ActivityInput(Sport.Running, null, km, null);

        Assert.Equal(expectedPoints, _sut.CalculatePoints(input));
    }

    [Fact]
    public void Cycling_10Km_To250Points()
    {
        var input = new ActivityInput(Sport.Cycling, null, 10m, null);

        Assert.Equal(250, _sut.CalculatePoints(input));
    }

    [Fact]
    public void Swimming_30Minutes_To450Points()
    {
        var input = new ActivityInput(Sport.Swimming, null, null, "30:00");

        Assert.Equal(450, _sut.CalculatePoints(input));
    }
}
