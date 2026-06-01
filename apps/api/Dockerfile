# syntax=docker/dockerfile:1.7
# ---- deps ----
FROM python:3.12-slim AS deps
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl tini \
 && rm -rf /var/lib/apt/lists/*
RUN pip install uv
WORKDIR /app
COPY pyproject.toml ./
# POSIX-safe (Docker RUN uses /bin/sh — no bash process substitution).
# Compile pyproject deps to a file, then install from it. cairosvg + all
# label-render deps come from pyproject so no separate fallback list needed.
RUN uv venv \
 && uv pip compile pyproject.toml -o /tmp/requirements.txt \
 && uv pip install --python /app/.venv/bin/python -r /tmp/requirements.txt

# ---- builder ----
FROM deps AS builder
COPY src ./src
COPY scripts ./scripts
COPY alembic.ini ./

# ---- runtime ----
FROM python:3.12-slim AS runtime
# PYTHONPATH=/app/src makes the `panelos_api` package importable (deps are
# installed in the venv, but the project itself is run from source).
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH" PYTHONPATH="/app/src"
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 tini ca-certificates \
    libcairo2 libpango-1.0-0 libgdk-pixbuf-2.0-0 fontconfig fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 10001 panelos
WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/scripts /app/scripts
COPY --from=builder /app/alembic.ini /app/alembic.ini
# Install bundled label fonts so cairosvg's system fallback resolves them too.
RUN mkdir -p /usr/share/fonts/truetype/panelos \
 && cp /app/src/panelos_api/labels/assets/*.ttf /usr/share/fonts/truetype/panelos/ 2>/dev/null || true \
 && fc-cache -f || true
RUN chmod +x /app/scripts/start.sh
USER panelos
EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini", "--"]
# start.sh runs `alembic upgrade head` then launches uvicorn (honors $PORT), so
# migrations apply automatically on every deploy.
CMD ["/app/scripts/start.sh"]
