# Project plan

Internal working notes on the overall direction — not a deliverable, just
so the end goal doesn't get lost between sessions.

## Structure

Monorepo, root-level split:

```
/backend    ASP.NET Core Web API (Clean Architecture) — done
/frontend   Angular 22 app — done
/           docker-compose.yml to run both together — done
```

## Status

- [x] Backend: Domain / Application / Infrastructure / Api layers, EF Core +
      SQLite, FluentValidation, Swagger, unit + integration tests.
- [x] Frontend: Angular 22 + Material (dark violet theme per
      `DESIGN_HANDOFF.md`). Global Leaderboard (with client-side rank trend)
      and Personal Dashboard (stat cards, activity-volume line chart,
      sport-breakdown bar chart, 28-day heatmap, recent activities table,
      Log Activity dialog) — plus a Register flow. Unit tests via Vitest.
- [x] Docker: `docker-compose.yml` at the repo root builds and runs both
      containers with `docker compose up --build` (see README). Backend is a
      multi-stage SDK→ASP.NET runtime image; frontend is a multi-stage
      Node→nginx image, with nginx proxying `/api/*` to the backend service
      by container name. The SQLite file lives on a named volume so data
      survives container restarts. Ports were deliberately shifted (`1`
      prepended to the usual port) to avoid clashing with anything already
      running locally: API `15236`/`17039`, frontend `14200`.
