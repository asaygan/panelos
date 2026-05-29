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
RUN uv venv && uv pip install --python /app/.venv/bin/python -r <(uv pip compile pyproject.toml) || \
    (uv pip install --python /app/.venv/bin/python fastapi 'uvicorn[standard]' 'sqlalchemy[asyncio]>=2' asyncpg alembic pydantic pydantic-settings 'python-jose[cryptography]' 'passlib[argon2]' pyotp segno qrcode Pillow reportlab svgwrite boto3 redis slowapi nanoid structlog python-multipart httpx email-validator uuid7)

# ---- builder ----
FROM deps AS builder
COPY src ./src
COPY scripts ./scripts
COPY alembic.ini ./

# ---- runtime ----
FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH"
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
USER panelos
EXPOSE 8000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["uvicorn", "panelos_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
