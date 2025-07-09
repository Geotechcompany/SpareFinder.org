# This file makes the services directory a Python package
import logging

# Configure logging for the services package
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Output to console
        logging.FileHandler('services.log', mode='a', encoding='utf-8')  # Output to file
    ]
)

from .ai_service import analyze_part_image

__all__ = ['analyze_part_image'] 