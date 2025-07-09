import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic.config import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Server Configuration
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    DEBUG: bool = Field(default=False, description="Debug mode")
    ENVIRONMENT: str = Field(
        default="development",
        description="Application environment (development, staging, production)"
    )
    
    # Security
    API_KEY: str = Field(description="API key for authentication")
    ALLOWED_ORIGINS: str = Field(
        default="*",
        description="Allowed CORS origins (comma-separated)"
    )
    ALLOWED_HOSTS: str = Field(
        default="*",
        description="Allowed host headers (comma-separated)"
    )
    
    # AI API Configuration - Google Vision only
    # No additional AI API keys needed - using Google Vision API
    
    # Processing Configuration
    MAX_FILE_SIZE_MB: int = Field(default=10, description="Maximum file size in MB")
    BATCH_SIZE_LIMIT: int = Field(default=10, description="Maximum batch size for predictions")
    DEFAULT_CONFIDENCE_THRESHOLD: float = Field(
        default=0.5,
        description="Default confidence threshold for predictions"
    )
    
    # Database Configuration (Supabase)
    SUPABASE_URL: Optional[str] = Field(default=None, description="Supabase project URL")
    SUPABASE_KEY: Optional[str] = Field(default=None, description="Supabase anon/service key")
    SUPABASE_SERVICE_KEY: Optional[str] = Field(
        default=None,
        description="Supabase service role key for admin operations"
    )
    
    # Storage Configuration
    SUPABASE_STORAGE_BUCKET: str = Field(
        default="part-images",
        description="Supabase storage bucket name"
    )
    
    # Web Scraping Configuration
    WEB_SCRAPING_ENABLED: bool = Field(
        default=True,
        description="Enable web scraping for part information"
    )
    MAX_SCRAPING_SITES: int = Field(
        default=5,
        description="Maximum number of sites to scrape per search"
    )
    SCRAPING_DELAY: float = Field(
        default=2.0,
        description="Delay between scraping requests (seconds)"
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
    
    # Model type validation removed - using Google Vision API only
    
    # You.com API Configuration
    YOU_API_KEY: Optional[str] = Field(
        default=None,
        description="You.com API key for image analysis and web search"
    )
    YOU_API_BASE_URL: str = Field(
        default="https://chat-api.you.com/smart",
        description="Base URL for You.com API requests"
    )
    
    # OpenAI API Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv('OPENAI_API_KEY', None)
    
    # Google Vision API Configuration
    GOOGLE_VISION_API_KEY: Optional[str] = Field(
        default=None, 
        description="Google Vision API Key",
        validation_alias="GOOGLE_VISION_API_KEY"  # Simplified to use primary key only
    )
    GOOGLE_API_KEY: Optional[str] = os.getenv('GOOGLE_API_KEY', None)
    
    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v):
        """Validate environment."""
        allowed_envs = ["development", "staging", "production"]
        if v not in allowed_envs:
            raise ValueError(f"ENVIRONMENT must be one of: {allowed_envs}")
        return v
    
    @field_validator("DEFAULT_CONFIDENCE_THRESHOLD")
    @classmethod
    def validate_confidence_threshold(cls, v):
        """Validate confidence threshold range."""
        if not 0.0 <= v <= 1.0:
            raise ValueError("DEFAULT_CONFIDENCE_THRESHOLD must be between 0.0 and 1.0")
        return v
    
    # GPT-4 API key validation removed - using Google Vision API only
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Get ALLOWED_ORIGINS as a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def allowed_hosts_list(self) -> List[str]:
        """Get ALLOWED_HOSTS as a list."""
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",")]
    
    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"
    
    @property
    def database_url(self) -> str:
        """Get database URL for async connections."""
        return f"{self.SUPABASE_URL}/rest/v1/" if self.SUPABASE_URL else ""
    
    @property
    def is_web_scraping_enabled(self) -> bool:
        """Check if web scraping is enabled."""
        return self.WEB_SCRAPING_ENABLED
    
    # Ensure environment variables are loaded
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,  # Make it case-insensitive
        extra="ignore",
        env_prefix="",  # Remove any prefix
        populate_by_name=True  # Allow population by field name
    )

    def __init__(self, **data):
        """Custom initialization to ensure environment variables are loaded."""
        # Explicitly load from os.environ first
        env_vars = {
            k: v for k, v in os.environ.items() 
            if k in ['GOOGLE_VISION_API_KEY', 'google_vision_api_key']
        }
        data.update(env_vars)
        super().__init__(**data)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    settings = Settings()
    print(f"DEBUG: Google Vision API Key: {settings.GOOGLE_VISION_API_KEY}")  # Debug print
    
    # Raise error if key is not set
    if not settings.GOOGLE_VISION_API_KEY:
        raise ValueError("GOOGLE_VISION_API_KEY must be set in .env file")
    
    return settings 