import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server Configuration
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    DEBUG: bool = Field(default=False, description="Debug mode")
    ENVIRONMENT: str = Field(default="development", description="Environment (development/staging/production)")
    
    # Security
    API_KEY: str = Field(description="API key for authentication")
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins"
    )
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1"],
        description="Allowed host headers"
    )
    
    # AI Model Configuration (TensorFlow only)
    MODEL_PATH: str = Field(
        default="/app/models/mobilenet_v2",
        description="Path to TensorFlow model files"
    )
    MODEL_TYPE: str = Field(
        default="mobilenet_v2",
        description="Type of TensorFlow model (mobilenet_v2, efficientnet, custom)"
    )
    MODEL_CACHE_SIZE: int = Field(
        default=1,
        description="Number of models to keep in memory"
    )
    
    # Processing Configuration
    MAX_FILE_SIZE_MB: int = Field(default=10, description="Maximum file size in MB")
    BATCH_SIZE_LIMIT: int = Field(default=10, description="Maximum batch size for predictions")
    DEFAULT_CONFIDENCE_THRESHOLD: float = Field(
        default=0.5,
        description="Default confidence threshold for predictions"
    )
    
    # Database Configuration (Supabase)
    SUPABASE_URL: str = Field(description="Supabase project URL")
    SUPABASE_KEY: str = Field(description="Supabase anon/service key")
    SUPABASE_SERVICE_KEY: Optional[str] = Field(
        default=None,
        description="Supabase service role key for admin operations"
    )
    
    # Storage Configuration
    SUPABASE_STORAGE_BUCKET: str = Field(
        default="part-images",
        description="Supabase storage bucket name"
    )
    
    # Google Search API
    GOOGLE_API_KEY: Optional[str] = Field(
        default=None,
        description="Google API key for custom search"
    )
    GOOGLE_SEARCH_ENGINE_ID: Optional[str] = Field(
        default=None,
        description="Google Custom Search Engine ID"
    )
    
    # External Part Database APIs (Simplified)
    OCTOPART_API_KEY: Optional[str] = Field(
        default=None,
        description="Octopart/Nexar API key for part search"
    )
    
    MOUSER_API_KEY: Optional[str] = Field(
        default=None,
        description="Mouser API key for part search"
    )
    
    # Redis Configuration (for caching)
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Redis URL for caching (optional)"
    )
    
    # Monitoring & Observability
    SENTRY_DSN: Optional[str] = Field(
        default=None,
        description="Sentry DSN for error tracking"
    )
    
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    METRICS_ENABLED: bool = Field(default=True, description="Enable Prometheus metrics")
    
    # Performance Configuration
    WORKER_PROCESSES: int = Field(default=1, description="Number of worker processes")
    MAX_CONCURRENT_REQUESTS: int = Field(
        default=100,
        description="Maximum concurrent requests"
    )
    REQUEST_TIMEOUT: int = Field(default=30, description="Request timeout in seconds")
    
    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @validator("ALLOWED_HOSTS", pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts from string or list."""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v
    
    @validator("MODEL_TYPE")
    def validate_model_type(cls, v):
        """Validate model type (TensorFlow only)."""
        allowed_types = ["mobilenet_v2", "efficientnet", "custom"]
        if v not in allowed_types:
            raise ValueError(f"MODEL_TYPE must be one of: {allowed_types}")
        return v
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        """Validate environment."""
        allowed_envs = ["development", "staging", "production"]
        if v not in allowed_envs:
            raise ValueError(f"ENVIRONMENT must be one of: {allowed_envs}")
        return v
    
    @validator("DEFAULT_CONFIDENCE_THRESHOLD")
    def validate_confidence_threshold(cls, v):
        """Validate confidence threshold range."""
        if not 0.0 <= v <= 1.0:
            raise ValueError("DEFAULT_CONFIDENCE_THRESHOLD must be between 0.0 and 1.0")
        return v
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"
    
    @property
    def database_url(self) -> str:
        """Get database URL for async connections."""
        return f"{self.SUPABASE_URL}/rest/v1/"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings() 