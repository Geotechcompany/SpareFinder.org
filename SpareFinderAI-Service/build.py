import subprocess
import sys

def build_package():
    """Build the package with minimal configuration"""
    try:
        subprocess.check_call([
            sys.executable, 
            '-m', 'build', 
            '--wheel', 
            '--no-isolation'
        ])
        print("Package built successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Build failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    build_package() 