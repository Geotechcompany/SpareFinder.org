#!/usr/bin/env python3
"""
Start script for deployment
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
