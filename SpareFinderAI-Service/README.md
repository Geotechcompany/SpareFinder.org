# SpareFinder AI Service

Production-ready AI service for Manufacturing part identification and analysis.

## Features

- **AI-Powered Part Analysis**: Advanced image recognition for Manufacturing parts
- **Database Storage**: All jobs stored in Supabase database
- **Real-time Processing**: Fast analysis with progress tracking
- **Email Notifications**: Automated email updates for analysis results
- **REST API**: Complete API for integration

## Quick Start

1. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**

   ```bash
   cp .env.template .env
   # Edit .env with your configuration
   ```

3. **Run the Service**
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

## API Endpoints

- `POST /analyze` - Analyze part image
- `GET /jobs` - List all analysis jobs
- `GET /jobs/stats` - Get job statistics
- `GET /health` - Health check

## Database

The service uses Supabase for data storage. All analysis results are automatically saved to the database.

## Deployment

The service is ready for deployment on:

- Render
- Railway
- Docker
- Any cloud platform

## Environment Variables

Required environment variables:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `OPENAI_API_KEY` - Your OpenAI API key
- `SMTP_*` - Email configuration

## Support

For support and questions, contact the development team.
