#!/usr/bin/env python3
import subprocess
import sys
import platform
import os

def run_command(command):
    """Run a shell command with error handling."""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            text=True, 
            capture_output=True
        )
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error running {command}: {e}")
        print(f"Stderr: {e.stderr}")
        sys.exit(1)

def install_system_dependencies():
    """Install system-level dependencies for Docker environment."""
    # In Docker, we've already installed system dependencies in the Dockerfile
    print("Using pre-installed system dependencies")

def create_virtual_environment():
    """Create a virtual environment if it doesn't exist."""
    # In Docker, we've already created a virtual environment
    print("Using pre-created virtual environment")

def install_python_dependencies():
    """Install Python dependencies from requirements.txt."""
    # Ensure we're using the virtual environment's pip
    run_command('pip install --upgrade pip setuptools wheel')
    
    # Install project dependencies
    requirements_path = os.path.join(os.getcwd(), 'requirements.txt')
    if os.path.exists(requirements_path):
        run_command(f'pip install -r {requirements_path}')
    else:
        print(f"Warning: {requirements_path} not found")

def verify_dependencies():
    """Verify installed dependencies."""
    print("\n🔍 Verifying Installed Dependencies:")
    run_command('pip list')

def main():
    print("🚀 SpareFinderAI Dependency Installer (Docker Edition)")
    
    # Check Python version
    python_version = sys.version_info
    print(f"Python Version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    if python_version.major != 3 or python_version.minor < 8:
        print("⚠️ Warning: This script is tested with Python 3.8+")
    
    # Install dependencies
    install_system_dependencies()
    create_virtual_environment()
    install_python_dependencies()
    
    # Verify installations
    verify_dependencies()
    
    print("✅ Dependencies installed successfully!")

if __name__ == '__main__':
    main() 