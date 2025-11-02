# Backend - AI Spare Part Analyzer

FastAPI backend with CrewAI agents and WebSocket support.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `GMAIL_USER` - Gmail address for sending reports (required)
- `GMAIL_PASS` - Gmail App Password (required)
- `PORT` - Server port (default: 8000)

## API Endpoints

- `GET /` - API root
- `GET /health` - Health check
- `POST /analyze-part` - Start analysis (multipart form data)
- `WS /ws/progress` - WebSocket for real-time progress updates

## WebSocket Protocol

Send initial message:
```json
{
  "email": "user@example.com",
  "keywords": "optional keywords",
  "image": "base64-encoded-image-string"
}
```

Receive progress updates:
```json
{
  "stage": "part_identifier",
  "message": "Agent status message",
  "status": "in_progress|completed|error",
  "timestamp": 1234567890.123
}
```


