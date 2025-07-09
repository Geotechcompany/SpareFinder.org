#!/bin/bash

# SpareFinderAI Dependency Updater (Unix/macOS)

# Exit on any error
set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1)
print_message "🚀 SpareFinderAI Dependency Updater"
print_message "Python Version: $PYTHON_VERSION"

# Validate Python version
if [[ ! "$PYTHON_VERSION" =~ ^Python\ 3\.[11-12] ]]; then
    print_warning "⚠️ Warning: This script is tested with Python 3.11 and 3.12"
fi

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    print_message "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and upgrade dependencies
source venv/bin/activate

print_message "Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel

print_message "Installing dependencies with pre-built wheels..."
pip install --only-binary=:all: -r requirements.txt

print_message "✅ Dependencies updated successfully!"

# Optional: Deactivate virtual environment
deactivate 