import os
import sys
import subprocess

def get_version():
    """Retrieve version from VERSION file or use default"""
    version_file = os.path.join(os.path.dirname(__file__), 'VERSION')
    try:
        with open(version_file, 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return "1.0.1"

def build_package():
    """Build the package with error handling"""
    try:
        # Ensure we're using the correct Python interpreter
        python_executable = sys.executable
        
        # Build wheel
        subprocess.check_call([
            python_executable, 
            '-m', 'build', 
            '--wheel', 
            '--no-isolation'
        ])
        
        print("Package built successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during build: {e}")
        sys.exit(1)

def main():
    # Set version in VERSION file
    version = get_version()
    
    # Build the package
    build_package()

if __name__ == '__main__':
    main() 