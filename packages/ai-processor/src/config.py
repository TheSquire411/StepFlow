"""
Configuration settings for AI Processor service
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Redis configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # AI Service API Keys
    OPENAI_API_KEY: Optional[str] = None
    ELEVENLABS_API_KEY: Optional[str] = None
    
    # AWS Configuration
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    
    # Processing configuration
    MAX_WORKERS: int = 4
    MAX_QUEUE_SIZE: int = 1000
    PROCESSING_TIMEOUT: int = 300  # 5 minutes
    
    # File storage
    TEMP_DIR: str = "/tmp/stepflow"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    # Computer Vision settings
    CV_MODEL_PATH: str = "models/"
    OCR_LANGUAGES: str = "en"
    
    # Content generation settings
    MAX_CONTENT_LENGTH: int = 4000
    DEFAULT_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"  # ElevenLabs default
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()