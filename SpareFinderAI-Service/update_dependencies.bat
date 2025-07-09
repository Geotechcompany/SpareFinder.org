@echo off
setlocal enabledelayedexpansion

echo 🚀 SpareFinderAI Dependency Updater (Windows)

REM Check Python version
for /f "delims=" %%a in ('python --version') do set "PYTHON_VERSION=%%a"
echo Python Version: !PYTHON_VERSION!

REM Validate Python version
echo !PYTHON_VERSION! | findstr /R /C:"^Python 3\.[11-12]" > nul
if errorlevel 1 (
    echo ⚠️ Warning: This script is tested with Python 3.11 and 3.12
)

REM Create virtual environment if not exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment and upgrade dependencies
call venv\Scripts\activate && (
    echo Upgrading pip, setuptools, and wheel...
    pip install --upgrade pip setuptools wheel

    echo Installing dependencies with pre-built wheels...
    pip install --only-binary=:all: -r requirements.txt

    echo ✅ Dependencies updated successfully!
)

pause 