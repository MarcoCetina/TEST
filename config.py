"""Configuration settings for Power BI Data Chat."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

    # Anthropic Claude API - This is the only required key!
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
