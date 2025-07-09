import os
import subprocess
import sys
import venv

def create_venv(venv_path):
    """Create a virtual environment."""
    print(f"Creating virtual environment in {venv_path}")
    venv.create(venv_path, with_pip=True)

def install_dependencies(venv_path, requirements_path):
    """Install dependencies from requirements file."""
    pip_path = os.path.join(venv_path, 'Scripts', 'pip.exe') if sys.platform == 'win32' else os.path.join(venv_path, 'bin', 'pip')
    
    # Upgrade pip, setuptools, and wheel
    subprocess.check_call([pip_path, 'install', '--upgrade', 'pip', 'setuptools', 'wheel'])
    
    # Install requirements
    subprocess.check_call([pip_path, 'install', '-r', requirements_path])

def main():
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define paths
    venv_path = os.path.join(script_dir, 'venv')
    requirements_path = os.path.join(script_dir, 'requirements.txt')
    
    # Create virtual environment
    if not os.path.exists(venv_path):
        create_venv(venv_path)
    
    # Install dependencies
    install_dependencies(venv_path, requirements_path)
    
    print("Dependencies installed successfully!")

if __name__ == '__main__':
    main() 