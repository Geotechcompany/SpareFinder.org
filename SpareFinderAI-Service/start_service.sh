#!/bin/bash

# SpareFinderAI Service Startup Script

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Set environment variables (optional)
export PYTHONUNBUFFERED=1

# Start the service
echo "Starting SpareFinderAI Service..."
python start_service.py --host 0.0.0.0 --port 8000 --reload

# Deactivate virtual environment
deactivate 