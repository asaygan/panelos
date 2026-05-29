# Docker

PanelOS ships multi-stage Docker images for the API and the web. Compose orchestrates the local dev dependency stack.

## Compose stack

`infra/compose/docker-compose.yml`:

| Service | Image | Purpose |
|---|---|---|
| `postgres` | `postgres:16` | DB |
| `redis` | `redis:7` | cache, rate limit, rq |
| `minio` | `minio/minio:latest` | S3-compatible dev storage |
| `mailhog` | `mailhog/mailhog` | SMTP catcher |
| `api` | built from `infra/docker/api.Dockerfile` | FastAPI app |
| `web` | built from `infra/docker/web.Dockerfile` | Next.js |
| `worker` | same image as `api`, alt CMD | rq worker |

Each app declares healthchecks; `depends_on: { condition: service_healthy }` ensures sane startup order.

### Overrides

- `docker-compose.override.yml` — local dev with bind mounts and hot reload (web `next dev`, api `uvicorn --reload`).
- `docker-compose.prod.yml` — pinned digests, no source mount, strict healthchecks. Not used in our PaaS deploy — only for self-hosted customers.

## Dockerfile pattern

Three stages: `deps → build → runtime`.

```dockerfile
# infra/docker/api.Dockerfile
FROM python:3.12-slim AS deps
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv && uv sync --frozen --no-install-project

FROM deps AS build
COPY apps/api ./apps/api
RUN uv sync --frozen

FROM python:3.12-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
RUN useradd -r -u 1001 panelos
USER panelos
WORKDIR /app
COPY --from=build --chown=panelos:panelos /app /app
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "panelos_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Properties:

- Runs as non-root (`uid 1001`).
- `tini` as PID 1 for signal handling.
- No build tools in the runtime stage.
- `.dockerignore` excludes `tests/`, `docs/`, `__pycache__`.

## Image hygiene

- Tags: `ghcr.io/<org>/panelos-api:<git-sha>` and `:vX.Y.Z`.
- SBOM generated via `docker buildx build --sbom=true`.
- Trivy scan in CI ([pipeline](../ci-cd/pipeline.md)).
