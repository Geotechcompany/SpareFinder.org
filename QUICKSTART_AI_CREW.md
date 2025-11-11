# 🚀 Quick Start: AI Analysis Crew

Get your AI Analysis Crew up and running in 5 minutes!

## ⚡ Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed
- OpenAI API key
- Gmail account with App Password

## 📋 Step-by-Step Setup

### 1️⃣ Frontend Setup (2 minutes)

```bash
# Add environment variables
echo "VITE_AI_CREW_API_URL=http://localhost:8000" >> .env
echo "VITE_AI_CREW_WS_URL=ws://localhost:8000" >> .env

# Install dependencies (if not already done)
npm install

# Start frontend
npm run dev
```

Frontend will be at: `http://localhost:5173`

### 2️⃣ Backend Setup (3 minutes)

```bash
# Navigate to AI Crew backend
cd ai-analysis-crew

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Edit .env with your keys:
nano .env  # or use your favorite editor
```

**Required in `.env`:**
```bash
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
GMAIL_USER=your.email@gmail.com
GMAIL_PASS=your_app_password_here
```

**Get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Search "App passwords"
4. Generate password for "Mail"
5. Copy to `GMAIL_PASS`

```bash
# Start the backend
python run.py
```

Backend will be at: `http://localhost:8000`

### 3️⃣ Test It! (30 seconds)

1. Go to `http://localhost:5173/upload`
2. Upload a part image
3. Click **"🤖 SpareFinder AI Research"**
4. Enter your email
5. Click **"🚀 Start Analysis"**
6. Watch the magic happen! ✨

## 🎯 What You'll Get

After 2-5 minutes, you'll receive a professional PDF report via email with:

- ✅ **Part Identification** - Complete details with model numbers
- ✅ **Technical Specs** - Dimensions, weight, materials, etc.
- ✅ **Top 3 Suppliers** - Contact info, pricing, locations
- ✅ **Alternatives** - 3-5 replacement options
- ✅ **Recommendations** - Best options for your needs

## 🐛 Quick Troubleshooting

**Backend won't start?**
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

**Frontend can't connect?**
- Check backend is running: `curl http://localhost:8000/health`
- Verify `.env` has correct URLs

**Email not sending?**
- Use Gmail App Password (not regular password)
- Check SMTP settings in `ai-analysis-crew/.env`

## 📖 Need More Help?

- Full Guide: `AI_CREW_INTEGRATION_GUIDE.md`
- Backend Docs: `ai-analysis-crew/README.md`
- Deployment: `ai-analysis-crew/RENDER_DEPLOYMENT.md`

## 🎉 That's It!

You're now running a powerful AI analysis system with:
- 5 specialized AI agents
- GPT-4o Vision
- Real-time WebSocket updates
- Professional PDF reports
- Email delivery

Happy analyzing! 🚀







