# Project plan

Internal working notes on the overall direction — not a deliverable, just
so the end goal doesn't get lost between sessions.

## Structure

Monorepo, root-level split:

```
/backend    ASP.NET Core Web API (Clean Architecture) — done
/frontend   Angular app — not started yet
/           docker-compose.yml to run both together — not started yet
```

## Status

- [x] Backend: Domain / Application / Infrastructure / Api layers, EF Core +
      SQLite, FluentValidation, Swagger, unit + integration tests.
- [ ] Frontend: Angular app with Global Leaderboard and Personal Dashboard
      views (activity volume over time, sport breakdown charts).
- [ ] Docker: containerize backend and frontend, wire up with
      `docker-compose.yml` so the whole stack runs with one command. SQLite
      db file needs a persistent volume mount so data survives container
      restarts.

## Notes for the Docker step (when we get there)

- Backend container: multi-stage Dockerfile (SDK image to build/publish,
  ASP.NET runtime image to run).
- Frontend container: multi-stage Dockerfile (Node image to build, nginx or
  similar to serve the static build).
- `docker-compose.yml` at repo root, one service per app, backend on its own
  port, frontend proxying `/api` to the backend service by container name.
- Keep the SQLite file on a named volume, not baked into the image.
