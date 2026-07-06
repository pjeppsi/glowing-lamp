<#
.SYNOPSIS
    Seeds trend-testable activity data for the users created by Seed-Data.ps1.

.DESCRIPTION
    Logs one activity in each of four buckets, all relative to whenever this
    script is run: last week, this week (but before today), yesterday, and
    today. This puts real data on both sides of the leaderboard's "Today" and
    "Week" trend cutoffs, so toggling those windows shows a genuine mix of
    up/down/same instead of everyone reading "-" (all-time has no cutoff) or
    "same" (no activity actually straddling a cutoff).

    Also forces a guaranteed rank overtake: finds the two highest-scoring
    seeded users and logs a large steps activity today for whichever is
    currently behind, so it jumps ahead of the other specifically in the
    Today/Week windows - without this, whether any two users' relative order
    actually differs between "now" and "before the window" is left to the
    random four-bucket amounts above, and could easily show "same" everywhere.

    Also walks Petar Celar from last place up through the rankings via logged
    activities (never a direct DB write), timed so that toggling Month/Week/Day
    each shows a different previousRank/positionChange for him - a believable
    multi-granularity climb (and a small dip today) rather than a single
    forced overtake.

    Also registers one brand-new user ("Nova Osoba") with a single activity
    logged today and nothing before it - since Seed-Data.ps1 already backfills
    the other seven users with a full history, none of them can genuinely show
    "new" (they all have activity before every cutoff). A truly fresh user is
    the only reliable way to demonstrate the "new" trend.

    Looks up the seven existing users' IDs via the leaderboard endpoint (no
    direct DB access, same approach as Seed-Data.ps1) - run that script first.

.PARAMETER ApiBaseUrl
    Base URL of the running API. Defaults to the local dev port.

.EXAMPLE
    ./Seed-Trend-Data.ps1
    Run the backend first, then Seed-Data.ps1, then this script.
#>
param(
    [string]$ApiBaseUrl = "http://localhost:15236/api"
)

$ErrorActionPreference = "Stop"

$userNames = @(
    @{ FirstName = "Petar"; LastName = "Čelar" },
    @{ FirstName = "Cristiano"; LastName = "Ronaldo" },
    @{ FirstName = "Lionel"; LastName = "Messi" },
    @{ FirstName = "Luka"; LastName = "Modrić" },
    @{ FirstName = "Mateo"; LastName = "Kovačić" },
    @{ FirstName = "Igor"; LastName = "Matanović" },
    @{ FirstName = "Sandro"; LastName = "Sukno" }
)

$newUser = @{ FirstName = "Nova"; LastName = "Osoba" }

Write-Host "Fetching current leaderboard to resolve user IDs..."
$leaderboard = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/leaderboard?pageSize=500"
$userIdByName = @{}
foreach ($entry in $leaderboard.entries) {
    $userIdByName["$($entry.firstName) $($entry.lastName)"] = $entry.userId
}

# Same week-start rule as the backend's LeaderboardWindow cutoff (Monday start).
$today = (Get-Date).Date
$yesterday = $today.AddDays(-1)
$dayOfWeek = [int]$today.DayOfWeek
$mondayOffset = if ($dayOfWeek -eq 0) { -6 } else { 1 }
$thisMonday = $today.AddDays(-$dayOfWeek + $mondayOffset)
$lastMonday = $thisMonday.AddDays(-7)
# Same month-start rule as the backend's LeaderboardWindow cutoff.
$thisMonthStart = (Get-Date -Year $today.Year -Month $today.Month -Day 1).Date

function Get-RandomDateBetween {
    param([datetime]$From, [datetime]$To)
    $spanDays = ($To - $From).Days
    if ($spanDays -le 0) {
        return $From
    }
    return $From.AddDays((Get-Random -Minimum 0 -Maximum ($spanDays + 1)))
}

# entry.previousPoints is null (not present in the JSON as an int) whenever
# the leaderboard API has no prior snapshot for that user under this window
# (AllTime, or a "new" user with nothing before the cutoff).
function Get-OrZero {
    param($Value)
    if ($null -eq $Value) { return 0 }
    return $Value
}

# If today is Monday, "this week so far" has no day before today - falls back
# to today itself (a second, separate activity logged on the same calendar day).
$thisWeekDay = if ($thisMonday -lt $yesterday) { Get-RandomDateBetween $thisMonday $yesterday } else { $thisMonday }
$lastWeekDay = Get-RandomDateBetween $lastMonday ($thisMonday.AddDays(-1))

# Same activity-variety generator as Seed-Data.ps1.
$distanceRanges = @{
    running = @(200, 1500)
    walking = @(100, 1000)
    cycling = @(500, 4000)
}
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

function Add-TrendActivity {
    param([string]$UserId, [datetime]$Date, [string]$Label)

    $body = New-RandomActivityBody -UserId $UserId -Date $Date
    Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($body | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null
    $sportLabel = if ($body.sport) { $body.sport } else { "steps" }
    Write-Host "    [$Label] $($Date.ToString('yyyy-MM-dd')) - $sportLabel"
}

foreach ($user in $userNames) {
    $fullName = "$($user.FirstName) $($user.LastName)"
    if (-not $userIdByName.ContainsKey($fullName)) {
        Write-Warning "Skipping $fullName - not found on the leaderboard. Run Seed-Data.ps1 first."
        continue
    }
    $userId = $userIdByName[$fullName]
    Write-Host "Seeding trend activities for $fullName ($userId)"

    Add-TrendActivity -UserId $userId -Date $lastWeekDay -Label "last week"
    Add-TrendActivity -UserId $userId -Date $thisWeekDay -Label "this week"
    Add-TrendActivity -UserId $userId -Date $yesterday -Label "yesterday"
    Add-TrendActivity -UserId $userId -Date $today -Label "today"
}

# The four-bucket activities above are random-sized, so whether anyone's
# current (all-time) rank actually differs from their pre-window rank is left
# to chance - two users could easily end up with the same relative order in
# both snapshots, showing "same" everywhere instead of a genuine swap. To
# guarantee the UI has at least one visible overtake, find the two
# highest-scoring seeded users, and log a big enough steps activity today for
# whichever of the two is currently behind to jump ahead of the other. Since
# this activity's timestamp is today, it counts toward the "now" total but
# falls after the Today/Week cutoffs, so it flips the Today and Week rank
# order for that pair without touching the AllTime total order (which has no
# "before" snapshot to flip against).
Write-Host ""
Write-Host "Forcing a guaranteed rank overtake for the Today/Week windows..."
$sampleUserIds = $userIdByName.Values | ForEach-Object { $_ }
$leaderboardAfter = Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/leaderboard?pageSize=500"
$topTwo = $leaderboardAfter.entries |
    Where-Object { $sampleUserIds -contains $_.userId } |
    Sort-Object -Property totalPoints -Descending |
    Select-Object -First 2

if ($topTwo.Count -eq 2) {
    $ahead = $topTwo[0]
    $behind = $topTwo[1]
    $gap = [math]::Max(0, $ahead.totalPoints - $behind.totalPoints)
    $overtakePoints = $gap + 20
    $overtakeSteps = $overtakePoints * 100

    $overtakeBody = @{
        userId   = $behind.userId
        datetime = $today.AddHours(12).ToString("yyyy-MM-ddTHH:mm:ssZ")
        steps    = $overtakeSteps
    }
    Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($overtakeBody | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null

    Write-Host "  $($behind.firstName) $($behind.lastName) logged $overtakeSteps steps today (+$overtakePoints pts) to overtake $($ahead.firstName) $($ahead.lastName) (was $gap pts behind) - toggle Today/Week to see the rank swap."
}
else {
    Write-Warning "Not enough seeded users on the leaderboard to force an overtake."
}

# Walks Petar Celar from last place up through the rankings entirely via
# logged activities (no direct DB writes), so that toggling Month/Week/Day
# each shows a genuinely different previousRank/positionChange for him - a
# believable multi-granularity climb instead of the single-window overtake
# forced above for the top two.
#
#   Month cutoff (start of this month): Petar is last.
#   Week cutoff (this Monday):          Petar has already climbed mid-pack
#                                        (dated after month start, before this
#                                        Monday - baked into the Week
#                                        baseline, so it only shows up as
#                                        "up" under Month, not Week).
#   Day cutoff (start of today):        Petar has overtaken the pack (dated
#                                        after this Monday, before today - baked
#                                        into the Day baseline, so it only
#                                        shows up as "up" under Week, not Day).
#   Today:                              whoever is now directly behind him
#                                        catches up today, so the Day/Today
#                                        window shows him sliding back down -
#                                        a dip right after the climb, not a
#                                        monotonic rise at every granularity.
Write-Host ""
Write-Host "Walking Petar Celar from last place up through the rankings..."
if ($thisMonday -eq $today) {
    Write-Warning "Today is Monday, so the Week and Day cutoffs are the same instant (both 'start of today') - the backend's own GetCutoff logic, not a seed script limitation. Week and Today will show identical trend/previousRank for everyone until tomorrow; re-run on a non-Monday to see them diverge."
}
$petarFullName = "Petar Čelar"

if (-not $userIdByName.ContainsKey($petarFullName)) {
    Write-Warning "Skipping Petar's climb - not found on the leaderboard. Run Seed-Data.ps1 first."
}
else {
    $petarId = $userIdByName[$petarFullName]
    $otherSampleIds = $userIdByName.Values | Where-Object { $_ -ne $petarId }

    # Step 1: guarantee Petar is last as of the start of this month. Seed-Data.ps1's
    # history is random, so he might not naturally be - top up (via a single
    # backdated activity, safely before month start) anyone who doesn't already
    # out-score his pre-month total.
    $monthBoard = (Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/leaderboard?window=month&pageSize=500").entries
    $petarPreMonth = Get-OrZero (($monthBoard | Where-Object { $_.userId -eq $petarId }).previousPoints)
    $beforeMonthDate = $thisMonthStart.AddDays(-30)

    foreach ($id in $otherSampleIds) {
        $theirPreMonth = Get-OrZero (($monthBoard | Where-Object { $_.userId -eq $id }).previousPoints)
        if ($theirPreMonth -le $petarPreMonth) {
            $topUpPoints = $petarPreMonth - $theirPreMonth + 20
            $topUpBody = @{ userId = $id; datetime = $beforeMonthDate.ToString("yyyy-MM-ddTHH:mm:ssZ"); steps = $topUpPoints * 100 }
            Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($topUpBody | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null
        }
    }
    Write-Host "  Confirmed Petar Celar was last as of the start of this month."

    # Step 2: climb mid-pack during the month, before this week.
    $monthOthersMax = ($monthBoard | Where-Object { $otherSampleIds -contains $_.userId } | ForEach-Object { Get-OrZero $_.previousPoints } | Measure-Object -Maximum).Maximum
    $step2Points = [math]::Max(50, $monthOthersMax - $petarPreMonth - 50)
    $duringMonthDay = if ($thisMonthStart -lt $thisMonday.AddDays(-1)) { Get-RandomDateBetween $thisMonthStart ($thisMonday.AddDays(-1)) } else { $thisMonthStart }

    $step2Body = @{ userId = $petarId; datetime = $duringMonthDay.ToString("yyyy-MM-ddTHH:mm:ssZ"); steps = $step2Points * 100 }
    Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($step2Body | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null
    Write-Host "  Petar Celar climbed mid-pack during the month (+$step2Points pts on $($duringMonthDay.ToString('yyyy-MM-dd')))."

    # Step 3: overtake the pack this week, before yesterday.
    $weekBoard = (Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/leaderboard?window=week&pageSize=500").entries
    $weekOthersMax = ($weekBoard | Where-Object { $otherSampleIds -contains $_.userId } | ForEach-Object { $_.totalPoints } | Measure-Object -Maximum).Maximum
    $petarAfterStep2 = (($weekBoard | Where-Object { $_.userId -eq $petarId }).totalPoints)
    $step3Points = [math]::Max(20, $weekOthersMax - $petarAfterStep2 + 20)
    $duringWeekDay = if ($thisMonday -lt $yesterday) { Get-RandomDateBetween $thisMonday $yesterday } else { $thisMonday }

    $step3Body = @{ userId = $petarId; datetime = $duringWeekDay.ToString("yyyy-MM-ddTHH:mm:ssZ"); steps = $step3Points * 100 }
    Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($step3Body | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null
    Write-Host "  Petar Celar overtook the pack this week (+$step3Points pts on $($duringWeekDay.ToString('yyyy-MM-dd')))."

    # Step 4: today, whoever is now directly behind him catches back up, so the
    # Day/Today window shows him sliding down instead of climbing forever.
    $todayBoard = (Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/leaderboard?pageSize=500").entries
    $petarNow = $todayBoard | Where-Object { $_.userId -eq $petarId }
    $chaser = $todayBoard |
        Where-Object { $otherSampleIds -contains $_.userId -and $_.totalPoints -lt $petarNow.totalPoints } |
        Sort-Object -Property totalPoints -Descending |
        Select-Object -First 1

    if ($chaser) {
        $catchUpPoints = $petarNow.totalPoints - $chaser.totalPoints + 20
        $catchUpBody = @{ userId = $chaser.userId; datetime = $today.AddHours(18).ToString("yyyy-MM-ddTHH:mm:ssZ"); steps = $catchUpPoints * 100 }
        Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/activities" -Body ($catchUpBody | ConvertTo-Json) -ContentType "application/json; charset=utf-8" | Out-Null
        Write-Host "  $($chaser.firstName) $($chaser.lastName) caught up today (+$catchUpPoints pts), nudging Petar Celar down for the Day/Today window."
    }
    else {
        Write-Warning "No chaser found behind Petar Celar - skipping the Day/Today dip."
    }
}

$newFullName = "$($newUser.FirstName) $($newUser.LastName)"
Write-Host "Registering $newFullName (no history before today - demonstrates the 'new' trend)"
try {
    $registerBody = @{ firstName = $newUser.FirstName; lastName = $newUser.LastName } | ConvertTo-Json
    $registered = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/users" -Body $registerBody -ContentType "application/json; charset=utf-8"
    Add-TrendActivity -UserId $registered.id -Date $today -Label "today"
}
catch {
    Write-Warning "Skipping $newFullName - registration failed (likely already exists from a previous run)."
}

Write-Host ""
Write-Host "Done. Toggle Today/Week on the leaderboard to see up/down/new/same trends."
