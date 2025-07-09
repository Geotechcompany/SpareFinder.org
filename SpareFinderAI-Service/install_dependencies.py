import subprocess
import sys
import os
import venv

def create_virtual_environment():
    """Create a virtual environment"""
    venv_path = os.path.join(os.path.dirname(__file__), 'venv')
    venv.create(venv_path, with_pip=True)
    print(f"Virtual environment created at {venv_path}")

def install_dependencies():
    """Install dependencies from requirements.txt"""
    try:
        # Determine the correct pip executable based on the operating system
        pip_executable = os.path.join('venv', 'Scripts', 'pip') if sys.platform == 'win32' else os.path.join('venv', 'bin', 'pip')
        
        # Install dependencies
        subprocess.check_call([pip_executable, 'install', '-r', 'requirements.txt'])
        print("Dependencies installed successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)

def main():
    """Main function to set up the project environment"""
    print("Setting up GitHub AI Part Analysis Service...")
    
    # Check if virtual environment exists, if not create one
    venv_path = os.path.join(os.path.dirname(__file__), 'venv')
    if not os.path.exists(venv_path):
        create_virtual_environment()
    
    # Install dependencies
    install_dependencies()
    
    # Provide next steps
    print("\nSetup complete!")
    print("Next steps:")
    print("1. Activate the virtual environment:")
    print("   - On Windows: .\\venv\\Scripts\\activate")
    print("   - On Unix/MacOS: source venv/bin/activate")
    print("2. Set your GitHub token in the .env file")
    print("3. Run the part analysis script: python github_ai_part_analysis.py")

if __name__ == '__main__':
    main() 