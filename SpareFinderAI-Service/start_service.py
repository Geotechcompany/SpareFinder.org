import os
import sys
import subprocess
import signal
import logging
import time
from typing import Optional

def setup_logging():
    """Set up logging for the startup script"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('service_startup.log', mode='a', encoding='utf-8')
        ]
    )
    return logging.getLogger(__name__)

def find_python_executable() -> str:
    """Find the most appropriate Python executable"""
    python_paths = [
        sys.executable,  # Current Python interpreter
        'python3',
        'python',
        os.path.join(sys.prefix, 'bin', 'python'),
        os.path.join(sys.prefix, 'Scripts', 'python.exe')
    ]
    
    for path in python_paths:
        try:
            result = subprocess.run([path, '--version'], 
                                    capture_output=True, 
                                    text=True, 
                                    timeout=5)
            if result.returncode == 0:
                return path
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            continue
    
    raise RuntimeError("No suitable Python executable found")

def start_uvicorn(logger, host: str = '0.0.0.0', port: int = 8000, reload: bool = False):
    """
    Start Uvicorn server with robust error handling
    
    :param logger: Logging instance
    :param host: Host to bind the server
    :param port: Port to listen on
    :param reload: Enable auto-reload for development
    """
    python_executable = find_python_executable()
    
    # Construct Uvicorn command
    uvicorn_command = [
        python_executable, 
        '-m', 'uvicorn', 
        'app.main:app', 
        '--host', host, 
        '--port', str(port)
    ]
    
    # Add reload flag if specified
    if reload:
        uvicorn_command.extend(['--reload'])
    
    logger.info(f"Starting service with command: {' '.join(uvicorn_command)}")
    
    # Environment setup
    env = os.environ.copy()
    env['PYTHONUNBUFFERED'] = '1'
    
    # Process management
    process: Optional[subprocess.Popen] = None
    restart_count = 0
    max_restarts = 5
    
    try:
        while restart_count < max_restarts:
            try:
                process = subprocess.Popen(
                    uvicorn_command, 
                    env=env, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE,
                    universal_newlines=True
                )
                
                # Log output in real-time
                while True:
                    output = process.stdout.readline()
                    if output == '' and process.poll() is not None:
                        break
                    if output:
                        logger.info(output.strip())
                
                # Check process exit status
                return_code = process.poll()
                if return_code == 0:
                    logger.info("Service stopped gracefully")
                    break
                else:
                    restart_count += 1
                    logger.warning(f"Service crashed. Restart attempt {restart_count}")
                    time.sleep(2)  # Wait before restarting
            
            except Exception as e:
                logger.error(f"Service startup error: {e}")
                break
        
        if restart_count >= max_restarts:
            logger.critical(f"Failed to start service after {max_restarts} attempts")
            sys.exit(1)
    
    except KeyboardInterrupt:
        logger.info("Service startup interrupted by user")
    finally:
        if process and process.poll() is None:
            process.terminate()
            process.wait()

def main():
    logger = setup_logging()
    
    # Parse command-line arguments
    import argparse
    parser = argparse.ArgumentParser(description='SpareFinderAI Service Launcher')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind the server')
    parser.add_argument('--port', type=int, default=8000, help='Port to listen on')
    parser.add_argument('--reload', action='store_true', help='Enable auto-reload for development')
    
    args = parser.parse_args()
    
    start_uvicorn(logger, args.host, args.port, args.reload)

if __name__ == '__main__':
    main() 