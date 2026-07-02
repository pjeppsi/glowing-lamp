# Fitness Challenge

Full-stack fitness challenge application: users log activities (running, walking,
cycling, gym, swimming, or daily steps), the backend normalizes them into a
unified points system, and a global leaderboard ranks users by total points.

This is a monorepo. Right now it contains the backend API; an Angular frontend
will be added under `frontend/` (see [PLAN.md](PLAN.md) for the overall
direction, including a Docker Compose setup that will run the whole stack).

## Tech stack

- **Backend:** ASP.NET Core Web API — .NET 10
- **ORM:** Entity Framework Core 10, SQLite (file-based)
- **Architecture:** Clean Architecture (Domain / Application / Infrastructure / Api)
- **Validation:** FluentValidation
- **API docs:** Swagger UI via Swashbuckle.AspNetCore

## Running the backend locally

Prerequisites: [.NET 10 SDK](https://dotnet.microsoft.com/download).

```bash
cd backend
dotnet run --project src/FitnessChallenge.Api
```

The database (`fitnesschallenge.db`, SQLite) is created automatically and
migrations are applied on startup — no manual `dotnet ef database update` step
is required.

Once running:
- Swagger UI: `https://localhost:<port>/swagger`
- API base URL: `https://localhost:<port>/api`

## Running the tests

```bash
cd backend
dotnet test
```

This runs both the scoring service unit tests
(`FitnessChallenge.Application.Tests`) and the API integration tests
(`FitnessChallenge.Api.Tests`, using an in-memory SQLite database via
`WebApplicationFactory`).

## API endpoints

| Endpoint | Description |
|---|---|
| `POST /api/users` | Register a user — `{ firstName, lastName }` → `201` with `{ id }`. Rejects duplicate names (case/Unicode-insensitive). |
| `GET /api/users/{id}` | User profile. `404` if not found. |
| `GET /api/users/{id}/activities` | A user's activity history. |
| `POST /api/activities` | Ingest a fitness activity. `201` on success, `400` on invalid input. |
| `GET /api/leaderboard` | Users ranked by total points (live aggregation). |

## Assumptions and known limitations

- `sport` is absent on the request for Daily Steps entries — there is no
  `"steps"` value in the `Sport` enum; absence of `sport` *is* the signal.
- Floor order differs by metric type and is intentional, not a shortcut:
  distance floors *after* multiplying by the point rate; duration and steps
  floor *before* dividing/multiplying. See `ScoringService` and its unit tests
  for the reasoning and the spec's own worked examples.
- Steps are floored per individual activity record, not per daily total —
  this matters because the two give different results. Two records of 50
  steps each on the same day score `floor(50→0)=0` twice (0 points total)
  under per-record flooring, versus `floor(100→100)=1` if the 100 combined
  steps were floored once as a daily sum. This implementation floors per
  record.
- `Duration` is stored in the database exactly as `"mm:ss"` (not converted to
  total seconds); the scoring service parses it once, at insert time.
- `Sport` is persisted as its string name, not EF Core's default integer
  ordinal, so the data stays readable and isn't silently corrupted if enum
  values are ever reordered.
- `User` has no denormalized `TotalPoints` column — the leaderboard is
  computed live via `SUM(Points) GROUP BY UserId` against `Activity` on every
  read. This avoids concurrent-update races on a shared counter at the cost
  of recomputing the aggregate each time, which is an acceptable trade-off at
  this scale.
- Leaderboard rank "trend" (up/down movement) is not implemented — the source
  spec does not define what a trend is measured against (previous day? previous
  request?), so it's left out rather than guessed at.
- There is no authentication/authorization; `userId` is accepted as-is with no
  verification of the caller's identity. Out of scope for this exercise.
- Duplicate-name detection compares `FirstName`/`LastName` case-insensitively
  using .NET's Unicode-aware `ToUpperInvariant()` on a computed column, not
  SQLite's built-in `NOCASE` collation (which only case-folds ASCII and would
  miss e.g. `"Perić"` vs `"PERIĆ"`).
