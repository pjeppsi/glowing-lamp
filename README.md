# Fitness Challenge

Full-stack fitness challenge application: users log activities (running, walking,
cycling, gym, swimming, or daily steps), the backend normalizes them into a
unified points system, and a global leaderboard ranks users by total points. A
personal dashboard visualizes each user's activity history.

This is a monorepo: `backend/` (ASP.NET Core API) and `frontend/` (Angular).
See [PLAN.md](PLAN.md) for the overall direction.

**Ports are non-default on purpose** (`1` prepended to whichever port each
tool normally picks) so they don't collide with anything else you might
already have running: API on `15236`/`17039`, frontend on `14200`.

## Running everything with Docker (recommended)

Prerequisites: Docker Desktop (with Compose).

```bash
docker compose up --build
```

This builds and starts both containers:
- **API** — multi-stage .NET build, on `http://localhost:15236`. The SQLite
  database file lives on a named volume (`db-data`), so data survives
  container restarts and `docker compose down`/`up` cycles (use
  `docker compose down -v` to wipe it).
- **Frontend** — multi-stage Node build served by nginx, on
  `http://localhost:14200`. nginx proxies `/api/*` to the API container over
  the internal Compose network, the same shape as the Angular dev-server
  proxy used for local development.

Open `http://localhost:14200` once both containers report as started.

To stop:

```bash
docker compose down
```

## Tech stack

- **Backend:** ASP.NET Core Web API — .NET 10
- **ORM:** Entity Framework Core 10, SQLite (file-based)
- **Architecture:** Clean Architecture (Domain / Application / Infrastructure / Api)
- **Validation:** FluentValidation
- **API docs:** Swagger UI via Swashbuckle.AspNetCore
- **Frontend:** Angular 22, Angular Material (dark, Material 3 violet theme), Chart.js via ng2-charts

## Running without Docker

### Backend

Prerequisites: [.NET 10 SDK](https://dotnet.microsoft.com/download).

```bash
cd backend
dotnet run --project src/FitnessChallenge.Api
```

The database (`fitnesschallenge.db`, SQLite) is created automatically and
migrations are applied on startup — no manual `dotnet ef database update` step
is required.

Once running:
- Swagger UI: `https://localhost:17039/swagger`
- API base URL: `https://localhost:17039/api` (or `http://localhost:15236/api`)

### Frontend

Prerequisites: Node.js ≥22.22 and npm.

```bash
cd frontend
npm install
npm start
```

Serves on `http://localhost:14200` with a dev-server proxy (`proxy.conf.json`)
forwarding `/api/*` to the backend at `http://localhost:15236` — run the
backend first (see above). On first visit you'll be redirected to
registration; after registering you land on your personal dashboard and can
log activities from there, or browse the global leaderboard.

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

To also see the leaderboard's Today/Week/Month trend indicators (up/down/same/new)
with a realistic mix instead of everyone reading the same value, run
`Seed-Trend-Data.ps1` afterwards — it logs activity on both sides of those
windows' cutoffs for the users `Seed-Data.ps1` just created, forces a
guaranteed rank overtake between two of them, and registers one brand-new
user with no prior history to demonstrate the "new" trend:

```powershell
./Seed-Trend-Data.ps1
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
  record. A concrete consequence: a user who logs 99 steps and then, in a
  separate record, 1 more step the same day scores 0 points total, versus 1
  point if they had logged 100 steps in a single record — fragmented entries
  can lose points relative to one combined entry. We accept this for the
  scope of this task because the spec does not define daily aggregation
  across records.
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
- Leaderboard rank "trend" (up/down/same/new) is computed server-side, live,
  entirely from `Activity` rows. For a given window (Today/Week/Month), "now"
  is the sum of all activities and "before" is the sum of activities strictly
  before the window's cutoff; both snapshots are ranked and compared.
  `AllTime` has no prior period to compare against, so its trend is always
  `"-"`. The response also exposes `previousRank`, `previousPoints`, and
  `positionChange` for a richer tooltip instead of a full side-by-side
  "round-by-round" table (like a football league table showing every
  matchday's standings) — that would need a persisted per-period ranking
  snapshot and considerably more work than the tooltip approach. We assume
  (the spec doesn't say either way) that a same-request tooltip showing where
  a user ranked before vs. now is sufficient for this exercise's scope.
- There is no authentication/authorization; `userId` is accepted as-is with no
  verification of the caller's identity. Out of scope for this exercise.
- Duplicate-name detection compares `FirstName`/`LastName` case-insensitively
  using .NET's Unicode-aware `ToUpperInvariant()` on a computed column, not
  SQLite's built-in `NOCASE` collation (which only case-folds ASCII and would
  miss e.g. `"Perić"` vs `"PERIĆ"`).

### Frontend

- **Leaderboard rank trend** is rendered straight from the API response
  (`trend`, `previousRank`, `previousPoints`, `positionChange`) — the icon,
  label, and tooltip are all derived from what the backend already computed;
  no client-side history or `localStorage` is involved.
- **"Current user" / identity** is a `localStorage`-only concept — there's
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
