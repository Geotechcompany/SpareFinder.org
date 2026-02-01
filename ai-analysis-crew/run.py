"""
Run script for the backend server.
Use this instead of uvicorn command to avoid reload issues on Windows.
"""

import os
import uvicorn

if __name__ == "__main__":
    # Disable telemetry
    os.environ['OTEL_SDK_DISABLED'] = 'true'
    
    # Run without reload on Windows to avoid multiprocessing issues
    # For development, you can manually restart when needed
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=False,  # Disabled to avoid Windows reload issues - manually restart when needed
        log_level="info"
    )

