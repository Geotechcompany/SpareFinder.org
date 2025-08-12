import os
import sys
import logging
import uvicorn

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Configure logging
def configure_logging():
    """
    Configure logging with thread-safe and interrupt-resistant setup
    """
    logging.basicConfig(
        level=logging.INFO, 
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),  # Output to console
            logging.FileHandler('service_start.log', mode='a', encoding='utf-8')  # Output to file
        ]
    )
    
    # Suppress overly verbose logs from libraries
    logging.getLogger('uvicorn').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    logging.getLogger('uvicorn.error').setLevel(logging.WARNING)
    logging.getLogger('fastapi').setLevel(logging.WARNING)

def main():
    """
    Main entry point to start the FastAPI service
    """
    try:
        configure_logging()
        logger = logging.getLogger(__name__)
        
        logger.info("Starting SpareFinderAI Service...")
        
        uvicorn.run(
            "app.main:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True,
            log_level="info",
            # Restrict reload watch paths to exclude 'uploads'
            reload_dirs=[os.path.join(project_root, 'app')]
        )
    except Exception as e:
        logger.error(f"Failed to start service: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main() 