import subprocess
import sys

def build_package():
    """Minimal build package function"""
    try:
        subprocess.check_call([sys.executable, '-m', 'build'])
    except subprocess.CalledProcessError:
        sys.exit(1)

if __name__ == '__main__':
    build_package() 