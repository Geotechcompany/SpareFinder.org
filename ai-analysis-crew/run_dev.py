"""
Development run script with auto-reload (may have issues on Windows).
For stable development on Windows, use run.py instead.
"""

import os
import uvicorn

if __name__ == "__main__":
    # Disable telemetry
    os.environ['OTEL_SDK_DISABLED'] = 'true'
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        reload_dirs=["app"],
        log_level="info"
    )

