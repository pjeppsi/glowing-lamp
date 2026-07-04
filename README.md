# Fitness Challenge

Full-stack fitness challenge application: users log activities (running, walking,
cycling, gym, swimming, or daily steps), the backend normalizes them into a
unified points system, and a global leaderboard ranks users by total points. A
personal dashboard visualizes each user's activity history.

This is a monorepo: `backend/` (ASP.NET Core API) and `frontend/` (Angular).
See [PLAN.md](PLAN.md) for the overall direction, including a planned Docker
Compose setup to run the whole stack with one command.

## Tech stack

- **Backend:** ASP.NET Core Web API — .NET 10
- **ORM:** Entity Framework Core 10, SQLite (file-based)
- **Architecture:** Clean Architecture (Domain / Application / Infrastructure / Api)
- **Validation:** FluentValidation
- **API docs:** Swagger UI via Swashbuckle.AspNetCore
- **Frontend:** Angular 22, Angular Material (dark, Material 3 violet theme), Chart.js via ng2-charts

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

## Running the frontend locally

Prerequisites: Node.js ≥22.22 and npm.

```bash
cd frontend
npm install
npm start
```

Serves on `http://localhost:4200` with a dev-server proxy (`proxy.conf.json`)
forwarding `/api/*` to the backend at `http://localhost:5236` — run the backend
first (see above). On first visit you'll be redirected to registration; after
registering you land on your personal dashboard and can log activities from
there, or browse the global leaderboard.

## Seeding demo data

With the backend running against a fresh (empty) database, `backend/scripts/Seed-Data.ps1`
registers a fixed set of demo users and logs a randomized-but-realistic activity
history for each, from 2026-01-01 through today. It talks to the running API
over HTTP only (same validation and scoring path as the UI), so it doesn't
touch the database directly.

```powershell
cd backend/scripts
./Seed-Data.ps1
```

**Why a script against the running API, not an EF Core seed (`HasData`):** points must be produced by
`IScoringService`, the same code path a real request goes through — pre-computing them by hand for
`HasData` would duplicate the scoring formula in two places and risk the two drifting apart. Inserting
rows straight into the database via EF Core would also skip FluentValidation entirely, so seeded data
wouldn't actually prove the validation rules hold. `HasData` is meant for a fixed, compile-time-known
dataset baked into a migration — it doesn't fit "randomized but realistic activity history," which needs
to vary per run and shouldn't require a new migration just to reseed. Talking to the running API keeps
demo data on the exact same validation → scoring → persistence path as a real user's request.

## Running the tests

```bash
# Backend
cd backend
dotnet test

# Frontend
cd frontend
npm test
```

The backend suite runs both the scoring service unit tests
(`FitnessChallenge.Application.Tests`) and the API integration tests
(`FitnessChallenge.Api.Tests`, using an in-memory SQLite database via
`WebApplicationFactory`). The frontend suite (Vitest, via the Angular CLI)
covers the client-side leaderboard trend logic and the core feature
components.

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
- Tied leaderboard scores share the same rank, using "dense" ranking — two
  users tied at the top are both rank 1 and the next distinct score is rank 2,
  not 3. Ties are also broken deterministically by name (last, then first) so
  tied users don't reorder between calls with no underlying data change.
- Leaderboard rank "trend" (up/down movement) has no server-side mechanism —
  the spec does not define what a trend is measured against (previous day?
  previous request?), so the backend leaves it out rather than guessing.
  The frontend computes it client-side instead (see below).
- There is no authentication/authorization; `userId` is accepted as-is with no
  verification of the caller's identity. Out of scope for this exercise.
- Duplicate-name detection compares `FirstName`/`LastName` case-insensitively
  using .NET's Unicode-aware `ToUpperInvariant()` on a computed column, not
  SQLite's built-in `NOCASE` collation (which only case-folds ASCII and would
  miss e.g. `"Perić"` vs `"PERIĆ"`).

### Frontend

- **Leaderboard rank trend** is computed client-side: the browser keeps the
  last-seen rank per user in `localStorage` and diffs it against each new
  leaderboard response (up / down / same / new). This is a deliberate,
  documented choice given the backend's trend mechanism is left undefined —
  it's not persisted or shared across devices/browsers.
- **"Current user" / identity** is also a `localStorage`-only concept — there's
  no auth, so registering (or picking a name) simply remembers that user's id
  in the browser for the "Log Activity" flow and the Dashboard nav link.
  Anyone can still view any user's dashboard read-only via the leaderboard.
- **Sport icons** intentionally reuse a single generic icon
  (`directions_run`) across all sports rather than one icon per sport, per the
  design handoff's icon catalog (`DESIGN_HANDOFF.md`) — sport identity is
  carried by the label text and by chart color, not by an icon-per-sport
  scheme that isn't in the catalog.
- **Sport breakdown chart** uses activity *count* per sport (not points) —
  it answers "which sports do you do most," which is what "breakdown of
  preferred sports" asks for; points-over-time is already covered by the
  volume chart.
