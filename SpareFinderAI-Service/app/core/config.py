import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # Use model_config instead of Config
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=False
    )

    # Use Field for more explicit configuration
    openai_api_key: str = Field(default="", description="OpenAI API Key")
    google_vision_credentials: str = Field(default="", description="Google Vision API Credentials")
    supabase_url: str = Field(default="", description="Supabase Project URL")
    supabase_key: str = Field(default="", description="Supabase API Key")
    
    # Database settings
    database_url: str = Field(default="", description="Database Connection URL")
    
    # AI Service Configuration
    ai_model_path: str = Field(default="/app/models", description="Path to AI models")
    upload_directory: str = Field(default="/app/uploads", description="Directory for uploaded files")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", description="Logging level")
    log_file: str = Field(default="/app/logs/app.log", description="Log file path")

    # Optional settings with defaults
    max_upload_size: int = Field(default=10 * 1024 * 1024, description="Maximum upload file size (10MB)")
    allowed_image_types: list[str] = Field(
        default=["image/jpeg", "image/png", "image/webp"], 
        description="Allowed image MIME types"
    )

# Create a singleton settings instance
settings = Settings() 