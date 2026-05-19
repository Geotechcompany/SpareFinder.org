"""
Run script for the backend server.
Use this instead of uvicorn command to avoid reload issues on Windows.
"""

import os
from pathlib import Path

import uvicorn

if __name__ == "__main__":
    # Disable telemetry
    os.environ["OTEL_SDK_DISABLED"] = "true"

    # Load ai-analysis-crew/.env so PORT matches VITE_API_URL (default 8000).
    try:
        from dotenv import load_dotenv

        _env_path = Path(__file__).resolve().parent / ".env"
        if _env_path.exists():
            load_dotenv(dotenv_path=_env_path, override=False)
    except Exception:
        pass

    # Run without reload on Windows to avoid multiprocessing issues
    # For development, you can manually restart when needed
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8700")),
        reload=False,  # Disabled to avoid Windows reload issues - manually restart when needed
        log_level="info"
    )

