# GitHub AI Part Analysis Service

## Overview
This Python service leverages the GitHub AI model to perform comprehensive analysis of industrial parts through image recognition and advanced AI processing.

## Prerequisites
- Python 3.8+
- GitHub Personal Access Token with `models:read` permissions

## Setup

### 1. Environment Setup
1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Set GitHub Token
Set your GitHub token as an environment variable:

#### Bash/Unix
```bash
export GITHUB_TOKEN="your_github_token_here"
```

#### PowerShell
```powershell
$Env:GITHUB_TOKEN="your_github_token_here"
```

#### Windows Command Prompt
```cmd
set GITHUB_TOKEN=your_github_token_here
```

## Running the Service

### Start the API Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### 1. Part Analysis Endpoint
- **URL**: `/analyze-part/`
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Parameters**: 
  - `file`: Image file of the part to analyze

#### Example API Call (cURL)
```bash
curl -X POST \
  -F "file=@/path/to/your/part/image.jpg" \
  http://localhost:8000/analyze-part/
```

#### Example API Call (Python Requests)
```python
import requests

url = "http://localhost:8000/analyze-part/"
with open("/path/to/your/part/image.jpg", "rb") as image_file:
    files = {"file": image_file}
    response = requests.post(url, files=files)
    print(response.json())
```

### 2. Health Check Endpoint
- **URL**: `/health`
- **Method**: GET
- **Description**: Check service health status

#### Example Health Check
```bash
curl http://localhost:8000/health
```

## Response Format
- Immediate Response (202 Accepted):
  ```json
  {
    "message": "Part analysis started",
    "filename": "your_image.jpg",
    "status": "processing"
  }
  ```

## Analysis Framework
The service provides a comprehensive analysis including:
- Precise Part Identification
- Technical Deep Dive
- Market & Sourcing Intelligence
- Contextual Engineering Insights
- Expert Networking & Support
- Sustainability & Innovation Assessment

## Error Handling
- Supports various error scenarios
- Provides detailed error messages
- Handles file upload validation

## Security
- Uses environment variable for token management
- Implements CORS middleware
- Validates uploaded file types

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License
[Specify your license here]

## Contact
[Your contact information or support details] 