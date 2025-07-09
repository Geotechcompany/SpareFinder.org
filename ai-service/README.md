# GitHub AI Part Analysis Service

## Overview
This microservice provides AI-powered part image analysis using GitHub's AI capabilities.

## Prerequisites
- Python 3.8+
- GitHub Personal Access Token
- FastAPI
- OpenAI/GitHub AI Model Access

## Installation
1. Clone the repository
2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
Create a `.env` file with:
```
GITHUB_TOKEN=your_github_personal_access_token
OPENAI_API_KEY=your_openai_api_key  # Optional
```

## Running the Service
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints
- `/analyze-part/`: Upload an image for AI analysis
  - Method: POST
  - Accepts multipart/form-data with 'file' parameter
  - Returns JSON with analysis results

## Configuration
Modify `app/core/config.py` to adjust service settings.

## Error Handling
The service provides detailed error responses for various scenarios.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a pull request

## License
[Your License Here] 