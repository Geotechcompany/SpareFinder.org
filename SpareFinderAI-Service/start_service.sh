#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export GITHUB_TOKEN="${GITHUB_TOKEN:-your_github_token_here}"
export PORT="${PORT:-8000}"

# Start the FastAPI service
echo "Starting GitHub AI Part Analysis Service..."
uvicorn main:app --host 0.0.0.0 --port $PORT --reload 