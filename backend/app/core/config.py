import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "PulseCloud"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment & Security
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "pulsecloud-super-secret-key-for-development-change-in-prod-32bytes!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # Database
    # Default to local SQLite fallback if PostgreSQL is not specified
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./pulsecloud.db")
    
    # Redis & Background Tasks
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    # Scheduler Mode: 'asyncio' (built-in zero-dependency scheduler) or 'celery'
    SCHEDULER_MODE: str = os.getenv("SCHEDULER_MODE", "asyncio")
    
    # Monitoring Engine Defaults
    REQUEST_DEFAULT_TIMEOUT: float = 10.0
    MAX_RESPONSE_BODY_BYTES: int = 10240  # 10 KB limit for response preview/validation
    CONSECUTIVE_FAILURES_FOR_DOWN: int = 2
    LATENCY_DEGRADED_THRESHOLD_MS: float = 800.0
    ALERT_COOLDOWN_MINUTES: int = 15
    CHECK_RETENTION_DAYS: int = 30
    
    # SSRF Protection
    # In production, private networks are strictly blocked. In dev/testing, mock targets or localhost can be permitted via allowlist.
    SSRF_BLOCK_PRIVATE_NETWORKS: bool = True
    SSRF_ALLOWLIST_HOSTS: List[str] = ["127.0.0.1", "localhost", "testserver"]
    ALLOW_HTTP_FOR_MONITORING: bool = True  # Allows http and https
    
    # Demo Seed
    SEED_DEMO_DATA: bool = True

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()
