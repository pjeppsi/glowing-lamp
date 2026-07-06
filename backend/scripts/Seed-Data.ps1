<#
.SYNOPSIS
    Seeds the running Fitness Challenge API with demo users and a realistic,
    randomized activity history.

.DESCRIPTION
    Registers a fixed list of users (skips any that already exist) and, for
    each day between -StartDate and -EndDate, logs one activity per user
    (occasionally two) with realistic distance/duration/step values. Talks
    to the API over HTTP only, so it goes through the same validation and
    scoring logic as the UI - no direct database access.

.PARAMETER ApiBaseUrl
    Base URL of the running API. Defaults to the local dev port.

.PARAMETER StartDate
    First day to seed activities for. Defaults to 2026-01-01.

.PARAMETER EndDate
    Last day to seed activities for. Defaults to today.

.EXAMPLE
    ./Seed-Data.ps1
    Run the backend first (dotnet run --project src/FitnessChallenge.Api),
    then run this script from backend/scripts.
#>
param(
    [string]$ApiBaseUrl = "http://localhost:15236/api",
    [datetime]$StartDate = (Get-Date "2026-01-01"),
    [datetime]$EndDate = (Get-Date).Date
)

$ErrorActionPreference = "Stop"

$users = @(
    @{ FirstName = "Petar"; LastName = "Čelar" },
    @{ FirstName = "Cristiano"; LastName = "Ronaldo" },
    @{ FirstName = "Lionel"; LastName = "Messi" },
    @{ FirstName = "Luka"; LastName = "Modrić" },
    @{ FirstName = "Mateo"; LastName = "Kovačić" },
    @{ FirstName = "Igor"; LastName = "Matanović" },
    @{ FirstName = "Sandro"; LastName = "Sukno" }
)

# Distance sports: [min, max] km (x100 for two-decimal precision via Get-Random on integers).
$distanceRanges = @{
    running = @(200, 1500)   # 2.00 - 15.00 km
    walking = @(100, 1000)   # 1.00 - 10.00 km
    cycling = @(500, 4000)   # 5.00 - 40.00 km
}

# Duration sports: [min, max] minutes.
$durationRanges = @{
    gym      = @(20, 90)
    swimming = @(15, 60)
}

$sportChoices = @("running", "walking", "cycling", "gym", "swimming", "steps")

function New-RandomActivityBody {
    param([string]$UserId, [datetime]$Date)

    $sport = $sportChoices | Get-Random
    $hour = Get-Random -Minimum 6 -Maximum 22
    $minute = Get-Random -Minimum 0 -Maximum 60
    $dateTime = $Date.AddHours($hour).AddMinutes($minute).ToString("yyyy-MM-ddTHH:mm:ssZ")

    $body = @{
        userId   = $UserId
        datetime = $dateTime
    }

    if ($sport -eq "steps") {
        $body.steps = Get-Random -Minimum 1500 -Maximum 16000
    }
    elseif ($distanceRanges.ContainsKey($sport)) {
        $range = $distanceRanges[$sport]
        $raw = Get-Random -Minimum $range[0] -Maximum ($range[1] + 1)
        $body.sport = $sport
        $body.distance = [math]::Round($raw / 100, 2)
    }
    else {
        $range = $durationRanges[$sport]
        $minutes = Get-Random -Minimum $range[0] -Maximum ($range[1] + 1)
        $seconds = Get-Random -Minimum 0 -Maximum 60
        $body.sport = $sport
        $body.duration = "{0}:{1:D2}" -f $minutes, $seconds
    }

    return $body
}

$totalActivities = 0

foreach ($user in $users) {
    $registerBody = @{ firstName = $user.FirstName; lastName = $user.LastName } | ConvertTo-Json

    try {
        $registered = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/users" -Body $registerBody -ContentType "application/json; charset=utf-8"
        $userId = $registered.id
        Write-Host "Registered $($user.FirstName) $($user.LastName) -> $userId"
    }
    catch {
        Write-Warning "Skipping $($user.FirstName) $($user.LastName): registration failed (likely already exists). Reset the database for a clean seed run."
        continue
    }

    $activityCount = 0
    for ($date = $StartDate; $date -le $EndDate; $date = $date.AddDays(1)) {
        # Every day gets a logged activity, with occasional double-activity days.
        $body = New-RandomActivityBody -UserId $userId -Date $date
        Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($body | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null
        $activityCount++

        if ((Get-Random -Minimum 0.0 -Maximum 1.0) -lt 0.15) {
            $body2 = New-RandomActivityBody -UserId $userId -Date $date
            Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($body2 | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null
            $activityCount++
        }
    }

    Write-Host "  Logged $activityCount activities for $($user.FirstName) $($user.LastName)"
    $totalActivities += $activityCount
}

Write-Host ""
Write-Host "Done. Seeded $totalActivities activities across $($users.Count) users."
