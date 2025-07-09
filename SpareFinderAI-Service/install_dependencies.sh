#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Python 3
if ! command_exists python3; then
    echo "Error: Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Deactivate virtual environment
deactivate

echo "Setup complete!"
echo "To activate the virtual environment, run:"
echo "source venv/bin/activate"
echo ""
echo "Next steps:"
echo "1. Set your GitHub token in the .env file"
echo "2. Run the part analysis script: python github_ai_part_analysis.py" 