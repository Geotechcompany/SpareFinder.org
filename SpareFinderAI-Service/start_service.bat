@echo off
setlocal enabledelayedexpansion

:: SpareFinderAI Service Startup Script for Windows

:: Change to the script's directory
cd /d "%~dp0"

:: Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate

:: Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

:: Set environment variables
set PYTHONUNBUFFERED=1

:: Start the service
echo Starting SpareFinderAI Service...
python start_service.py --host 0.0.0.0 --port 8000 --reload

:: Deactivate virtual environment
deactivate

:: Pause to keep the window open if not run from a terminal
pause 