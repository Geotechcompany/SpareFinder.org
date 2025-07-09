from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Application Settings
    PROJECT_NAME: str = "SpareFinderAI Service"
    ENVIRONMENT: str = os.getenv('ENVIRONMENT', 'development')
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    
    # S3 Storage Configuration
    S3_ACCESS_KEY_ID: str = os.getenv('S3_ACCESS_KEY_ID', '')
    S3_SECRET_ACCESS_KEY: str = os.getenv('S3_SECRET_ACCESS_KEY', '')
    S3_ENDPOINT: str = os.getenv('S3_ENDPOINT', '')
    S3_BUCKET_NAME: str = os.getenv('S3_BUCKET_NAME', 'sparefinder')
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
    SUPABASE_ANON_KEY: str = os.getenv('SUPABASE_ANON_KEY', '')
    
    # Upload Configuration
    UPLOAD_DIR: str = os.path.join(os.getcwd(), 'uploads')
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10 MB
    
    # AI Service Configuration
    CONFIDENCE_THRESHOLD: float = 0.3
    MAX_PREDICTIONS: int = 3
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = 'ignore'

# Create a singleton instance
settings = Settings() 