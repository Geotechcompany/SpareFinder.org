from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Existing settings configuration
    PROJECT_NAME: str = "SpareFinderAI"
    API_V1_STR: str = "/api/v1"
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = Field(..., env="OPENAI_API_KEY")
    
    # AI Service Configuration
    AI_MODEL_PATH: str = Field(default="models/latest_model", env="AI_MODEL_PATH")
    CONFIDENCE_THRESHOLD: float = Field(default=0.5, env="CONFIDENCE_THRESHOLD")
    
    # Storage Configuration
    UPLOAD_DIRECTORY: str = Field(default="uploads/", env="UPLOAD_DIRECTORY")
    MAX_UPLOAD_SIZE: int = Field(default=10 * 1024 * 1024, env="MAX_UPLOAD_SIZE")  # 10MB
    
    # External API Configuration
    GOOGLE_VISION_API_KEY: str = Field(..., env="GOOGLE_VISION_API_KEY")
    
    # Logging Configuration
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings() 