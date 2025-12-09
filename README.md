# Power BI Data Chat

Chat with Claude AI about your Power BI data - **no API permissions or IT approvals needed!**

## How It Works

1. **Open Power BI** in your browser (you're already logged in)
2. **Export or copy** data from any table/visual
3. **Paste it** into this app
4. **Ask questions** - Claude analyzes your data!

## Quick Start (Windows)

### Option 1: Double-click to run
1. Download/clone this folder
2. Double-click `run.bat`
3. It will set everything up automatically
4. Open `http://localhost:5000` in your browser

### Option 2: Manual setup
```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with your Anthropic API key
copy .env.example .env
# Edit .env and add your key

# Run
python app.py
```

## Configuration

You only need **ONE thing**: an Anthropic API key

1. Go to https://console.anthropic.com/
2. Create an account and get an API key
3. Add it to your `.env` file:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

That's it! No Azure setup, no Power BI API permissions, no IT tickets.

## How to Get Data from Power BI

### Method 1: Export to CSV
1. Open your Power BI report at https://app.powerbi.com
2. Click on a table or visual
3. Click **...** (More options)
4. Select **Export data** → **CSV**
5. Open the downloaded file and copy contents

### Method 2: Direct Copy
1. In Power BI, click on a table
2. Select the cells you want (Ctrl+A for all)
3. Copy with Ctrl+C
4. Paste directly into the app

## Features

- **Model Selection**: Choose Sonnet 4.5 (fast) or Opus 4.5 (powerful)
- **Auto-parse**: Paste data and it automatically loads
- **Quick Questions**: One-click summaries, insights, and data quality checks
- **Conversation Memory**: Ask follow-up questions
- **Dark Theme**: Easy on the eyes

## Example Questions

- "Summarize this data for me"
- "What are the top 5 products by sales?"
- "Find any patterns or trends"
- "Are there any data quality issues?"
- "Calculate the average by category"
- "What insights can you find?"

## Project Structure

```
├── app.py              # Flask backend
├── config.py           # Configuration
├── requirements.txt    # Python packages
├── run.bat             # Windows launcher
├── .env.example        # Environment template
├── templates/
│   └── index.html      # Web UI
└── static/
    ├── css/style.css   # Styles
    └── js/app.js       # Frontend logic
```

## Troubleshooting

**"Claude API not configured"**
- Make sure you created a `.env` file with your API key
- Check the key starts with `sk-ant-`

**"Could not parse data"**
- Make sure the first row contains column headers
- Try exporting as CSV instead of copying

**App won't start**
- Make sure Python 3.9+ is installed
- Run `pip install -r requirements.txt` again

## License

MIT
