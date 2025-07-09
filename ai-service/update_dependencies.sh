#!/bin/bash

# Ensure we're in the correct directory
cd "$(dirname "$0")"

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Upgrade pip and setuptools
pip install --upgrade pip setuptools wheel

# Install or upgrade dependencies
pip install -r requirements.txt

# Optional: Verify installations
pip list

# Deactivate virtual environment
deactivate

echo "Dependencies updated successfully!" 