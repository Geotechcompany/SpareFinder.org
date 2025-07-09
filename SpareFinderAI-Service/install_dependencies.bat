@echo off
setlocal enabledelayedexpansion

REM Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and ensure it's added to PATH.
    pause
    exit /b 1
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate

REM Upgrade pip
python -m pip install --upgrade pip

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Deactivate virtual environment
deactivate

echo Setup complete!
echo To activate the virtual environment, run:
echo venv\Scripts\activate
echo.
echo Next steps:
echo 1. Set your GitHub token in the .env file
echo 2. Run the part analysis script: python github_ai_part_analysis.py

pause 