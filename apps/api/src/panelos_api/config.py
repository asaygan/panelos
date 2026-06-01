"""Application settings loaded from environment."""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    API_URL: str = "http://localhost:8000"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://panelos:panelos@localhost:5432/panelos"
    DATABASE_SYNC_URL: str = "postgresql://panelos:panelos@localhost:5432/panelos"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET: str = "change-me-in-prod"
    JWT_ALGORITHM: Literal["HS256", "RS256"] = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7

    # Storage
    STORAGE_PROVIDER: Literal["local", "s3", "supabase", "azure"] = "local"
    STORAGE_LOCAL_PATH: str = "./.storage"
    STORAGE_PUBLIC_BASE_URL: str = "http://localhost:8000/api/v1/files"

    # S3 / MinIO
    S3_ENDPOINT_URL: str | None = None
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str = "panelos"
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None

    # Supabase
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_KEY: str | None = None
    SUPABASE_BUCKET: str = "panelos"

    # Azure
    AZURE_STORAGE_ACCOUNT: str | None = None
    AZURE_STORAGE_KEY: str | None = None
    AZURE_CONTAINER: str = "panelos"

    # Mail
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM: str = "PanelOS <no-reply@panelos.app>"

    # Frontend
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"
    NEXT_PUBLIC_APP_URL: str = "http://localhost:3000"

    # Observability
    OTEL_EXPORTER_OTLP_ENDPOINT: str | None = None
    SENTRY_DSN: str | None = None
    LOG_LEVEL: Literal["debug", "info", "warning", "error", "critical"] = "info"

    # Feature flags
    FEATURE_SSO_SAML: bool = False
    FEATURE_MFA_REQUIRED: bool = False
    FEATURE_OFFLINE_EXPORT: bool = False

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
    """Cached settings instance."""

    return Settings()
