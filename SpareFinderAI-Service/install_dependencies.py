#!/usr/bin/env python3
import subprocess
import sys
import platform

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
    """Install system-level dependencies based on the operating system."""
    os_name = platform.system().lower()
    
    if os_name == 'linux':
        # Debian/Ubuntu style package management
        run_command('sudo apt-get update')
        run_command('sudo apt-get install -y python3-pip python3-venv')
    elif os_name == 'darwin':  # macOS
        run_command('brew update')
        run_command('brew install python')
    elif os_name == 'windows':
        # For Windows, we'll assume Python is already installed
        print("Windows detected. Ensure Python is installed via Python.org or Microsoft Store.")

def create_virtual_environment():
    """Create a virtual environment if it doesn't exist."""
    run_command('python -m venv venv')

def activate_virtual_environment():
    """Activate the virtual environment based on the operating system."""
    os_name = platform.system().lower()
    
    if os_name in ['linux', 'darwin']:
        activate_script = 'source venv/bin/activate'
    elif os_name == 'windows':
        activate_script = 'venv\\Scripts\\activate'
    else:
        print(f"Unsupported OS: {os_name}")
        sys.exit(1)
    
    return activate_script

def install_python_dependencies():
    """Install Python dependencies from requirements.txt."""
    run_command('pip install --upgrade pip setuptools wheel')
    run_command('pip install -r requirements.txt')

def main():
    print("🚀 SpareFinderAI Dependency Installer")
    
    # Check Python version
    python_version = sys.version_info
    print(f"Python Version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    if python_version.major != 3 or python_version.minor < 8:
        print("⚠️ Warning: This script is tested with Python 3.8+")
    
    # Install system dependencies
    install_system_dependencies()
    
    # Create virtual environment
    create_virtual_environment()
    
    # Activate virtual environment and install dependencies
    activate_script = activate_virtual_environment()
    print(f"Activating virtual environment: {activate_script}")
    
    # Install dependencies
    install_python_dependencies()
    
    print("✅ Dependencies installed successfully!")

if __name__ == '__main__':
    main() 