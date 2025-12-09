"""Configuration settings for the Power BI Claude Chatbot."""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Application configuration."""

    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

    # Anthropic Claude API
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')

    # Available Claude models
    CLAUDE_MODELS = {
        'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
        'claude-opus-4-5-20251101': 'Claude Opus 4.5',
        'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
        'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    }
    DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

    # Power BI Configuration
    POWERBI_CLIENT_ID = os.getenv('POWERBI_CLIENT_ID', '')
    POWERBI_CLIENT_SECRET = os.getenv('POWERBI_CLIENT_SECRET', '')
    POWERBI_TENANT_ID = os.getenv('POWERBI_TENANT_ID', '')
    POWERBI_WORKSPACE_ID = os.getenv('POWERBI_WORKSPACE_ID', '')

    # Power BI API endpoints
    POWERBI_API_URL = 'https://api.powerbi.com/v1.0/myorg'
    POWERBI_AUTHORITY = f'https://login.microsoftonline.com/{POWERBI_TENANT_ID}'
    POWERBI_SCOPE = ['https://analysis.windows.net/powerbi/api/.default']
