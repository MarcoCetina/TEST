@echo off
echo Power BI Claude Chatbot
echo ========================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install dependencies if requirements.txt is newer than installed flag
if not exist "venv\.installed" (
    echo Installing dependencies...
    pip install -r requirements.txt
    echo. > venv\.installed
)

REM Check for .env file
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and configure your API keys.
    echo.
    copy .env.example .env
    echo.
    echo Opening .env for editing...
    notepad .env
    pause
)

echo.
echo Starting server at http://localhost:5000
echo Press Ctrl+C to stop
echo.

python app.py
