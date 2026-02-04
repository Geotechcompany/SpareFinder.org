# AI Analysis Crew Integration Guide

## 🎉 Overview

You now have a powerful AI Analysis Crew integrated into your SpareFinder application! This system uses **CrewAI** with **GPT-4o Vision** and multiple specialized AI agents to provide comprehensive part analysis.

## 🏗️ Architecture

### Components Created

1. **`src/services/aiAnalysisCrew.ts`** - Service layer for AI Crew API
   - WebSocket support for real-time updates
   - HTTP fallback option
   - Type-safe interfaces

2. **`src/components/ComprehensiveAnalysisModal.tsx`** - User interface
   - Real-time progress tracking
   - Email input for PDF report delivery
   - Beautiful agent progress visualization

3. **Updated `src/pages/Upload.tsx`** - Main integration point
   - Replaced quick analysis with SpareFinder AI Research
   - Integrated modal trigger

## 🚀 Features

### Multi-Agent System (5 AI Agents)

1. **Image Analysis Agent** (GPT-4o Vision)
   - Analyzes uploaded images
   - Extracts detailed part information
   - Identifies visual features

2. **Part Identifier Agent**
   - Identifies manufacturer and part numbers
   - Determines part category
   - Provides application/compatibility info

3. **Technical Research Agent**
   - Finds detailed specifications
   - Materials and dimensions
   - Alternative/replacement options

4. **Supplier Finder Agent**
   - Discovers 2-3 verified suppliers
   - Provides complete contact information
   - Price ranges and availability

5. **Report Generator Agent**
   - Compiles comprehensive PDF report
   - Professional formatting
   - Multi-page structured document

6. **Email Agent**
   - Sends report via Gmail SMTP
   - Professional email template
   - Delivery confirmation

### Real-Time Progress Updates

The system provides live updates via WebSocket:
- ⚙️ Setup
- 🔍 Image Analysis
- 🔬 Part Identification
- 📊 Technical Research
- 🏪 Supplier Discovery
- 📄 Report Generation
- 📧 Email Delivery
- ✅ Completion

## 🔧 Configuration

### 1. Environment Variables

Add to your `.env` file:

```bash
# AI Analysis Crew Configuration
VITE_AI_CREW_API_URL=http://localhost:8000
VITE_AI_CREW_WS_URL=ws://localhost:8000
```

For production:
```bash
VITE_AI_CREW_API_URL=https://your-crew-api.onrender.com
VITE_AI_CREW_WS_URL=wss://your-crew-api.onrender.com
```

### 2. AI Crew Backend Setup

The AI Crew backend is located in `ai-analysis-crew/` folder.

#### Local Development

```bash
cd ai-analysis-crew

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your keys:
# - OPENAI_API_KEY
# - GMAIL_USER
# - GMAIL_PASS

# Run the server
python run.py
```

The API will be available at `http://localhost:8000`

#### Backend Environment Variables

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-...

# Gmail SMTP Configuration
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password_here  # Not your Gmail password!
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Server Configuration
PORT=8000
OTEL_SDK_DISABLED=true
```

**Important:** Use a Gmail App Password, not your regular password!
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use that password in `GMAIL_PASS`

### 3. Deploy Backend to Render (Optional)

The backend is already configured for Render deployment:

```bash
cd ai-analysis-crew

# The render.yaml is already configured
# Just push to your GitHub repo and connect to Render

# Or manually deploy:
# 1. Create new Web Service on Render
# 2. Connect your GitHub repo
# 3. Set root directory to: ai-analysis-crew
# 4. Environment: Docker
# 5. Add environment variables from .env
```

## 📖 Usage

### For Users

1. **Upload Part Image**
   - Go to Upload page
   - Upload an image of the part
   - Optionally add keywords

2. **Start Analysis**
   - Click "🤖 SpareFinder AI Research" button
   - Enter your email address
   - Click "🚀 Start Analysis"

3. **Watch Progress**
   - Real-time updates from all agents
   - See each agent's progress
   - Wait for completion (typically 2-5 minutes)

4. **Receive Report**
   - Professional PDF report sent to email
   - Contains:
     - Part identification
     - Technical specifications
     - Top 3 suppliers with contact info
     - Alternative options
     - Pricing information

### For Developers

#### Using the Service Directly

```typescript
import { useAIAnalysisCrew } from '@/services/aiAnalysisCrew';

const MyComponent = () => {
  const { analyzeWithCrew, checkServiceHealth } = useAIAnalysisCrew();

  const handleAnalysis = async (imageFile: File, email: string) => {
    const result = await analyzeWithCrew(
      email,
      imageFile,
      'optional keywords',
      (progress) => {
        console.log('Progress:', progress.stage, progress.message);
      }
    );

    if (result.status === 'success') {
      console.log('Analysis complete!', result.message);
    }
  };
};
```

#### Direct API Calls

**HTTP Endpoint:**
```bash
POST http://localhost:8000/analyze-part
Content-Type: multipart/form-data

user_email: user@example.com
keywords: brake pad front wheel
file: <image-file>
```

**WebSocket Endpoint:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/progress');

ws.onopen = () => {
  ws.send(JSON.stringify({
    email: 'user@example.com',
    keywords: 'brake pad',
    image: '<base64-encoded-image>'
  }));
};

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(update.stage, update.message);
};
```

## 🎨 UI Components

### ComprehensiveAnalysisModal

```tsx
<ComprehensiveAnalysisModal
  open={isOpen}
  onOpenChange={setIsOpen}
  imageFile={uploadedFile}
  keywords="brake pad front"
/>
```

**Props:**
- `open` - Boolean to control modal visibility
- `onOpenChange` - Callback when modal open state changes
- `imageFile` - File object of the uploaded image
- `keywords` - Optional keywords string

## 🔍 API Endpoints

### Health Check
```
GET /health
Response: { status: "healthy", service: "AI Spare Part Analyzer API" }
```

### Analyze Part (HTTP)
```
POST /analyze-part
Content-Type: multipart/form-data
Body:
  - user_email: string (required)
  - keywords: string (optional)
  - file: File (optional)

Response: { message: "Analysis started", email: "..." }
```

### WebSocket Progress
```
WS /ws/progress
Send: { email, keywords?, image? }
Receive: { stage, message, status, timestamp }
```

## 🐛 Troubleshooting

### Common Issues

**1. WebSocket Connection Failed**
- Check if backend is running
- Verify `VITE_AI_CREW_WS_URL` is correct
- Check firewall/CORS settings

**2. Email Not Sent**
- Verify Gmail App Password is correct
- Check SMTP settings in backend `.env`
- Ensure Gmail account has 2FA enabled

**3. Analysis Takes Too Long**
- Normal: 2-5 minutes per analysis
- Check OpenAI API key credits
- Monitor backend logs for errors

**4. Image Not Processing**
- Supported formats: JPEG, PNG, WebP
- Max size: 10MB (recommended: < 5MB)
- Check if image is corrupt

### Debugging

**Enable Debug Mode:**
```typescript
// In aiAnalysisCrew.ts, add console logs:
console.log('WebSocket state:', this.ws?.readyState);
console.log('Progress update:', update);
```

**Check Backend Logs:**
```bash
cd ai-analysis-crew
python run.py  # Watch console output
```

**Test API Directly:**
```bash
# Test health
curl http://localhost:8000/health

# Test with image
curl -X POST http://localhost:8000/analyze-part \
  -F "user_email=test@example.com" \
  -F "keywords=brake pad" \
  -F "file=@/path/to/image.jpg"
```

## 📊 Performance

- **Average Analysis Time:** 2-5 minutes
- **Concurrent Users:** Supports multiple simultaneous analyses
- **Image Processing:** GPT-4o Vision (high accuracy)
- **Report Generation:** Professional multi-page PDF
- **Email Delivery:** Instant via Gmail SMTP

## 🔐 Security Notes

1. **Never commit API keys** to version control
2. **Use App Passwords** for Gmail, not main password
3. **Validate email addresses** before processing
4. **Rate limit** API calls in production
5. **Sanitize user inputs** to prevent injection

## 🎯 Future Enhancements

Potential improvements:
- [ ] Add analysis history tracking
- [ ] Allow downloading PDF directly (no email)
- [ ] Support multiple images
- [ ] Add more AI agents (pricing, availability)
- [ ] Implement caching for similar parts
- [ ] Add batch analysis support
- [ ] Integrate with inventory system

## 📚 Additional Resources

- **CrewAI Documentation:** https://docs.crewai.com
- **OpenAI API Docs:** https://platform.openai.com/docs
- **Backend README:** `ai-analysis-crew/README.md`
- **Deployment Guide:** `ai-analysis-crew/RENDER_DEPLOYMENT.md`

## ✅ Success!

Your AI Analysis Crew is now fully integrated! Users can:
1. ✅ Upload part images
2. ✅ Get AI-powered analysis
3. ✅ Receive comprehensive PDF reports
4. ✅ Track real-time progress
5. ✅ Access verified suppliers
6. ✅ Get technical specifications

Happy analyzing! 🚀








