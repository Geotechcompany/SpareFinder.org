import subprocess
import sys
import traceback
import os

def log_error(message):
    """Log error to both console and file"""
    error_log_path = os.path.join(os.path.dirname(__file__), 'build_error.log')
    print(f"ERROR: {message}", file=sys.stderr)
    with open(error_log_path, 'a') as error_log:
        error_log.write(f"{message}\n")
        traceback.print_exc(file=error_log)

def build_package():
    """Comprehensive package build with extensive error handling"""
    try:
        # Ensure we're in the correct directory
        os.chdir(os.path.dirname(os.path.abspath(__file__)))
        
        # Print Python and setuptools versions
        print(f"Python Version: {sys.version}")
        
        # Attempt to build with verbose output
        build_command = [
            sys.executable, 
            '-m', 'build', 
            '--wheel', 
            '--no-isolation',
            '-v'  # Verbose mode
        ]
        
        # Run build command
        result = subprocess.run(
            build_command, 
            capture_output=True, 
            text=True, 
            check=False
        )
        
        # Print stdout and stderr
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        
        # Check return code
        if result.returncode != 0:
            log_error(f"Build failed with return code {result.returncode}")
            sys.exit(result.returncode)
        
        print("Package built successfully!")
    
    except Exception as e:
        log_error(f"Unexpected build error: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    build_package() 