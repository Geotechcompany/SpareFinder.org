"""Utility functions for the spare part analyzer."""

import os
from datetime import datetime
from pathlib import Path


def get_timestamp() -> str:
    """Generate a timestamp string."""
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def get_temp_path(filename: str) -> str:
    """Get a temporary file path."""
    # Use local temp directory relative to the app
    import os
    app_dir = Path(__file__).parent.parent
    temp_dir = app_dir / "temp"
    temp_dir.mkdir(exist_ok=True)
    return str(temp_dir / filename)


def ensure_temp_dir():
    """Ensure the temp directory exists."""
    import os
    app_dir = Path(__file__).parent.parent
    temp_dir = app_dir / "temp"
    temp_dir.mkdir(exist_ok=True)


