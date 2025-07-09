@echo off
setlocal

REM Activate virtual environment
call venv\Scripts\activate

REM Set environment variables (replace with your actual token)
set GITHUB_TOKEN=your_github_token_here
set PORT=8000

REM Start the FastAPI service
echo Starting GitHub AI Part Analysis Service...
uvicorn main:app --host 0.0.0.0 --port %PORT% --reload

pause 