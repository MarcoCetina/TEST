# Power BI Claude Chatbot

A web application that connects to your Power BI workspace and allows you to ask questions about your data using Claude AI.

![Power BI + Claude](https://img.shields.io/badge/Power%20BI-Claude%20AI-purple)

## Features

- **Power BI Integration**: Connect to your Power BI workspace and access datasets, reports, and dashboards
- **Claude AI Chat**: Ask natural language questions about your data
- **Model Selection**: Choose between Claude Sonnet 4.5, Opus 4.5, and other models
- **DAX Query Generation**: Get AI-generated DAX queries based on your requirements
- **Schema Analysis**: Understand your data structure with AI-powered explanations
- **Modern UI**: Clean, dark-themed interface optimized for Windows 11

## Prerequisites

- Python 3.9 or higher
- An Anthropic API key ([Get one here](https://console.anthropic.com/))
- Azure AD app registration with Power BI API permissions

## Quick Start

### 1. Clone and Setup

```bash
# Navigate to the project directory
cd TEST

# Create a virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy the example environment file
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac

# Edit .env with your credentials
```

### 3. Set Up Azure AD App (for Power BI)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Name your app (e.g., "Power BI Claude Chatbot")
5. Set redirect URI to `http://localhost:5000` (optional for this app)
6. After creation, note the **Application (client) ID** and **Directory (tenant) ID**
7. Go to **Certificates & secrets** > **New client secret**
8. Create a secret and copy the value immediately
9. Go to **API permissions** > **Add a permission**
10. Select **Power BI Service** and add these permissions:
    - `Dataset.Read.All`
    - `Report.Read.All`
    - `Dashboard.Read.All`
    - `Workspace.Read.All`
11. Click **Grant admin consent**

### 4. Run the Application

```bash
python app.py
```

Open your browser and navigate to `http://localhost:5000`

## Configuration

Edit your `.env` file with the following:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `POWERBI_CLIENT_ID` | Azure AD application client ID |
| `POWERBI_CLIENT_SECRET` | Azure AD application client secret |
| `POWERBI_TENANT_ID` | Azure AD tenant ID |
| `POWERBI_WORKSPACE_ID` | (Optional) Default workspace ID |
| `SECRET_KEY` | Flask session secret key |
| `DEBUG` | Set to `False` in production |

## Usage

### Connecting to Power BI

1. Click **Connect to Power BI** in the sidebar
2. Select your workspace from the dropdown
3. The app will load your datasets, reports, and dashboards

### Asking Questions

Simply type your question in the chat input. Examples:

- "What tables are in my dataset?"
- "Explain the relationships between my tables"
- "Generate a DAX query to calculate total sales by month"
- "What insights can you find in my data structure?"

### Quick Actions

Use the quick action buttons for common tasks:
- **Explain Schema**: Get an overview of your data structure
- **Suggest Queries**: Get recommended DAX queries
- **Find Insights**: Discover potential analysis opportunities

## Project Structure

```
TEST/
├── app.py                 # Main Flask application
├── config.py              # Configuration settings
├── powerbi_client.py      # Power BI API client
├── claude_client.py       # Claude AI client
├── requirements.txt       # Python dependencies
├── .env.example           # Environment template
├── README.md              # This file
├── templates/
│   └── index.html         # Main HTML template
└── static/
    ├── css/
    │   └── style.css      # Application styles
    └── js/
        └── app.js         # Frontend JavaScript
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application page |
| `/api/models` | GET | Get available Claude models |
| `/api/workspaces` | GET | Get Power BI workspaces |
| `/api/workspace/<id>/data` | GET | Get workspace data |
| `/api/chat` | POST | Send a chat message |
| `/api/generate-dax` | POST | Generate DAX query |
| `/api/execute-dax` | POST | Execute DAX query |
| `/api/health` | GET | Health check |

## Troubleshooting

### Common Issues

**"Power BI credentials not configured"**
- Make sure all Power BI environment variables are set in `.env`
- Verify your Azure AD app has the correct permissions

**"Failed to acquire token"**
- Check that your client secret hasn't expired
- Verify the tenant ID is correct
- Ensure admin consent was granted for API permissions

**"Anthropic API key not configured"**
- Add your API key to the `.env` file
- Get a key from [console.anthropic.com](https://console.anthropic.com/)

### Still Having Issues?

1. Check the console output for error messages
2. Verify all environment variables are set correctly
3. Make sure your Azure AD app has the required permissions
4. Test the `/api/health` endpoint to check configuration status

## Security Notes

- Never commit your `.env` file to version control
- Use strong, unique values for `SECRET_KEY` in production
- Rotate your API keys and client secrets regularly
- Consider using Azure Key Vault for production deployments

## License

MIT License - See LICENSE file for details
