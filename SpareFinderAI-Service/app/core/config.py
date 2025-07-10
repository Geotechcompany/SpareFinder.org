import os
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Use model_config for configuration
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=False,
        extra='ignore'
    )

    # Application Settings
    PROJECT_NAME: str = "SpareFinderAI Service"
    ENVIRONMENT: str = "development"

    # OpenAI Configuration
    OPENAI_API_KEY: str = ""
    
    # S3 Storage Configuration
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_ENDPOINT: str = ""
    S3_BUCKET_NAME: str = "sparefinder"
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    
    # Upload Configuration
    UPLOAD_DIR: str = os.path.join(os.getcwd(), 'uploads')
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    
    # AI Service Configuration
    CONFIDENCE_THRESHOLD: float = 0.3
    MAX_PREDICTIONS: int = 3
    
    # Logging Configuration
    LOG_LEVEL: str = "INFO"

# Create a singleton instance
settings = Settings() 