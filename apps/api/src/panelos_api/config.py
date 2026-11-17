"""Application settings loaded from environment."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_JWT_SECRET = "change-me-in-prod"


class Settings(BaseSettings):
    """Runtime configuration sourced from env."""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_ENV: Literal["development", "test", "staging", "production"] = "development"
    APP_NAME: str = "PanelOS"
    APP_URL: str = "http://localhost:3000"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://panelos:panelos@localhost:5432/panelos"
    DATABASE_SYNC_URL: str = "postgresql://panelos:panelos@localhost:5432/panelos"
    # Component parts. When DB_HOST is set, DATABASE_URL/DATABASE_SYNC_URL are
    # assembled at boot from these. Lets App Runner inject DB_PASSWORD from
    # Secrets Manager without leaking the value into a plain env var.
    DB_HOST: str | None = None
    DB_PORT: int = 5432
    DB_NAME: str = "postgres"
    DB_USER: str = "postgres"
    DB_PASSWORD: str | None = None
    # Non-owner role the API assumes per transaction so Postgres RLS is
    # enforced (see migration 0010). Unset = run as the connecting role.
    DB_APP_ROLE: str | None = None

    # Rate limiting (auth endpoints). Disable in tests to allow rapid logins.
    RATE_LIMIT_ENABLED: bool = True

    # Auth
    JWT_SECRET: str = _DEFAULT_JWT_SECRET
    JWT_ALGORITHM: Literal["HS256", "RS256"] = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7
    PASSWORD_RESET_TTL_MINUTES: int = 60
    INVITATION_TTL_DAYS: int = 14
    # Key for encrypting secrets at rest (TOTP seeds). Falls back to a key
    # derived from JWT_SECRET; set explicitly so the two can rotate separately.
    DATA_ENCRYPTION_KEY: str | None = None
    # When true every member must have MFA enabled to use the app.
    MFA_REQUIRED: bool = False

    # One-time tenant bootstrap (POST /auth/bootstrap). OFF by default: enable
    # only for the first deploy of an empty database, then turn it back off.
    BOOTSTRAP_ENABLED: bool = False

    # In-process periodic jobs (maintenance reminders). Off in tests.
    SCHEDULER_ENABLED: bool = True

    # Uploads
    MAX_UPLOAD_BYTES: int = 100 * 1024 * 1024  # 100 MB per schematic PDF

    # Storage
    STORAGE_PROVIDER: Literal["local", "s3"] = "local"
    STORAGE_LOCAL_PATH: str = "./.storage"
    STORAGE_PUBLIC_BASE_URL: str = "http://localhost:8000/api/v1/files"

    # S3 / MinIO
    S3_ENDPOINT_URL: str | None = None
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str = "panelos"
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None

    # Mail. EMAIL_PROVIDER: "log" (dev: print only), "smtp", or "ses" (AWS SES v2
    # using the instance role — no credentials in env).
    EMAIL_PROVIDER: Literal["log", "smtp", "ses"] = "log"
    EMAIL_FROM: str = "PanelOS <no-reply@panelos.io>"
    SES_REGION: str | None = None
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None

    # Observability
    SENTRY_DSN: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0
    LOG_LEVEL: Literal["debug", "info", "warning", "error", "critical"] = "info"

    # CORS
    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://localhost:8000"]
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v: object) -> object:
        """Accept a JSON array, a comma-separated string, or a list."""

        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                try:
                    return json.loads(s)
                except json.JSONDecodeError:
                    pass
            return [part.strip() for part in s.split(",") if part.strip()]
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached settings instance.

    When DB_HOST is provided (App Runner + Secrets Manager injection pattern),
    assemble DATABASE_URL / DATABASE_SYNC_URL from the component parts so the
    plaintext password never has to be set in a static env var.
    """

    s = Settings()
    if s.APP_ENV in ("production", "staging") and s.JWT_SECRET == _DEFAULT_JWT_SECRET:
        # Booting prod with the public default secret would let anyone forge
        # tokens for any user. Refuse to start instead.
        raise RuntimeError(f"JWT_SECRET must be set when APP_ENV={s.APP_ENV}")
    if s.DB_HOST and s.DB_PASSWORD:
        from urllib.parse import quote_plus

        pw = quote_plus(s.DB_PASSWORD)
        user = quote_plus(s.DB_USER)
        s.DATABASE_URL = f"postgresql+asyncpg://{user}:{pw}@{s.DB_HOST}:{s.DB_PORT}/{s.DB_NAME}"
        s.DATABASE_SYNC_URL = (
            f"postgresql+psycopg://{user}:{pw}@{s.DB_HOST}:{s.DB_PORT}/{s.DB_NAME}"
        )
    return s
