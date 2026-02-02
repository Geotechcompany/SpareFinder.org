# AI Part Finder Backend Setup Guide

## 🏗️ **Architecture Overview**

```
Frontend (React/TS) → API Gateway → Microservices
                                  ├── AI Service (FastAPI + TensorFlow)
                                  ├── Parts Service (Node.js/TS)
                                  └── Search Service (Node.js/TS)
                                          ↓
                                    Supabase DB + Storage
```

## 📋 **Prerequisites**

- **Python 3.9+** with pip
- **Node.js 18+** with npm/yarn
- **Docker & Docker Compose**
- **Supabase Account** (free tier works)
- **Google Cloud Account** (for Search API)

## 🚀 **Quick Start**

### **1. Clone and Setup Project Structure**

```bash
# Create project structure
mkdir ai-part-finder-backend
cd ai-part-finder-backend

# Initialize AI Service (Python FastAPI)
mkdir ai-service
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialize Main Backend (Node.js/TypeScript)
cd ../
mkdir backend
cd backend
npm init -y
npm install typescript @types/node ts-node nodemon
npm install fastify @fastify/cors @fastify/multipart
npm install @supabase/supabase-js axios form-data uuid
```

### **2. Set Up Supabase Database**

```sql
-- Create parts table
CREATE TABLE parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  part_number TEXT UNIQUE,
  description TEXT,
  category TEXT,
  manufacturer TEXT,
  compatibility TEXT[],
  estimated_price TEXT,
  image_url TEXT,
  embedding VECTOR(512), -- For similarity search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create part_analyses table
CREATE TABLE part_analyses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  image_url TEXT NOT NULL,
  predictions JSONB NOT NULL,
  processing_time FLOAT,
  model_version TEXT,
  confidence_threshold FLOAT DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX parts_name_idx ON parts USING GIN (to_tsvector('english', name));
CREATE INDEX parts_category_idx ON parts (category);
CREATE INDEX part_analyses_user_id_idx ON part_analyses (user_id);
CREATE INDEX part_analyses_created_at_idx ON part_analyses (created_at DESC);

-- Enable Row Level Security
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE part_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Parts are viewable by everyone" ON parts FOR SELECT USING (true);
CREATE POLICY "Users can view their own analyses" ON part_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own analyses" ON part_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('part-images', 'part-images', true);

-- Create storage policy
CREATE POLICY "Anyone can upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'part-images');
CREATE POLICY "Anyone can view images" ON storage.objects FOR SELECT USING (bucket_id = 'part-images');
```

### **3. Configure Environment Variables**

Create `.env` files for each service:

**ai-service/.env:**
```env
# Copy from env.example and fill in your values
API_KEY=your-secure-api-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
# ... other variables
```

**backend/.env:**
```env
# Main backend service
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
AI_SERVICE_URL=https://aiagent-sparefinder-org.onrender.com
AI_SERVICE_API_KEY=your-secure-api-key-here
```

## 🤖 **Phase 1: AI Service Setup**

### **Start with Pre-trained Models**

```bash
cd ai-service

# Download a pre-trained model (example with MobileNetV2)
mkdir -p models/mobilenet_v2
python scripts/download_model.py --model mobilenet_v2 --output models/
```

**scripts/download_model.py:**
```python
import tensorflow as tf
import argparse
import os

def download_mobilenet_v2(output_dir):
    """Download and save MobileNetV2 model."""
    model = tf.keras.applications.MobileNetV2(
        weights='imagenet',
        include_top=True,
        input_shape=(224, 224, 3)
    )
    
    model_path = os.path.join(output_dir, 'mobilenet_v2.h5')
    model.save(model_path)
    
    # Save ImageNet class names
    class_names_path = os.path.join(output_dir, 'class_names.txt')
    # Download ImageNet labels or create Engineering spares-specific labels
    Engineering spares_classes = [
        "brake_pad", "brake_rotor", "air_filter", "oil_filter",
        "spark_plug", "battery", "tire", "headlight", "taillight",
        # ... add more Engineering spares parts
    ]
    
    with open(class_names_path, 'w') as f:
        for class_name in Engineering spares_classes:
            f.write(f"{class_name}\n")
    
    print(f"Model saved to {model_path}")
    print(f"Class names saved to {class_names_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    if args.model == "mobilenet_v2":
        download_mobilenet_v2(args.output)
```

### **Run AI Service**

```bash
# Start the AI service
cd ai-service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Test the service
curl -X GET https://aiagent-sparefinder-org.onrender.com/health
curl -X GET https://aiagent-sparefinder-org.onrender.com/health/ready
```

## 🔧 **Phase 2: TypeScript Integration**

### **Create Main Backend Service**

**backend/src/app.ts:**
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { AIIntegrationService } from './services/aiIntegration';

const fastify = Fastify({ logger: true });

// Register plugins
fastify.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:5173']
});
fastify.register(multipart);

// Initialize AI service
const aiService = new AIIntegrationService(
  process.env.AI_SERVICE_URL!,
  process.env.AI_SERVICE_API_KEY!,
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Routes
fastify.post('/api/parts/analyze', async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const imageBuffer = await data.toBuffer();
    
    const result = await aiService.analyzePart({
      imageFile: imageBuffer,
      fileName: data.filename,
      mimeType: data.mimetype,
      userId: request.headers['user-id'] as string
    });

    return result;
  } catch (error) {
    fastify.log.error(error);
    return reply.code(500).send({ error: 'Analysis failed' });
  }
});

fastify.get('/api/health', async () => {
  const aiHealth = await aiService.healthCheck();
  return {
    status: 'healthy',
    services: {
      ai: aiHealth
    }
  };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Backend server running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

### **Run Backend Service**

```bash
cd backend
npm run dev
```

## 🔍 **Phase 3: External API Integration**

### **RS Components API Integration**

```typescript
// backend/src/services/externalAPIs/rsComponents.ts
export class RSComponentsAPI {
  private apiKey: string;
  private baseUrl = 'https://api.rs-online.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchParts(query: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/products/search`, {
        params: {
          term: query,
          rows: 10
        },
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      return response.data.products || [];
    } catch (error) {
      console.error('RS Components API error:', error);
      return [];
    }
  }
}
```

### **Google Custom Search Setup**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Custom Search API
3. Create a Custom Search Engine at [CSE](https://cse.google.com/cse/)
4. Configure to search Engineering spares parts websites
5. Get API key and Search Engine ID

## 📊 **Phase 4: Monitoring & Deployment**

### **Docker Deployment**

```bash
# Build and run with Docker Compose
cd ai-service
docker-compose up --build

# Scale services
docker-compose up --scale ai-service=3
```

### **Production Deployment**

**Option 1: Cloud Run (Google Cloud)**
```bash
# Build for production
docker build -t gcr.io/your-project/ai-service .
docker push gcr.io/your-project/ai-service

# Deploy to Cloud Run
gcloud run deploy ai-service \
  --image gcr.io/your-project/ai-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Option 2: Railway/Heroku**
```bash
# For Railway
railway login
railway init
railway up

# For Heroku
heroku create your-ai-service
heroku container:push web
heroku container:release web
```

## 🔒 **Security Best Practices**

### **1. API Security**
- Use strong API keys (32+ characters)
- Implement rate limiting
- Add request validation
- Use HTTPS in production

### **2. Supabase Security**
```sql
-- Enable RLS on all tables
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Create secure policies
CREATE POLICY "authenticated_users_only" ON part_analyses 
  FOR ALL USING (auth.role() = 'authenticated');
```

### **3. Environment Security**
```bash
# Use Docker secrets in production
echo "your-api-key" | docker secret create api_key -

# Or use cloud-native secret management
# Google Secret Manager, AWS Secrets Manager, etc.
```

## 📈 **Performance Optimization**

### **1. Model Optimization**
```python
# Use TensorFlow Lite for faster inference
converter = tf.lite.TFLiteConverter.from_saved_model('model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
```

### **2. Caching Strategy**
```typescript
// Implement Redis caching
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache predictions
await redis.setex(`prediction:${imageHash}`, 3600, JSON.stringify(result));
```

### **3. Database Optimization**
```sql
-- Add vector index for similarity search
CREATE INDEX parts_embedding_idx ON parts USING ivfflat (embedding vector_cosine_ops);
```

## 🧪 **Testing**

### **Unit Tests**
```bash
cd ai-service
pytest tests/

cd backend
npm test
```

### **Integration Tests**
```bash
# Test complete pipeline
curl -X POST http://localhost:3001/api/parts/analyze \
  -F "file=@test-brake-pad.jpg" \
  -H "user-id: test-user-123"
```

## 📋 **Checklist for Production**

- [ ] **AI Service Ready**
  - [ ] Model loaded and tested
  - [ ] Health checks working
  - [ ] Error handling implemented
  - [ ] Logging configured
  
- [ ] **Backend Integration**
  - [ ] File upload working
  - [ ] Supabase connection tested
  - [ ] External APIs configured
  - [ ] Rate limiting implemented
  
- [ ] **Database Setup**
  - [ ] Tables created
  - [ ] RLS policies configured
  - [ ] Indexes optimized
  - [ ] Backup strategy implemented
  
- [ ] **Security**
  - [ ] API keys secured
  - [ ] HTTPS configured
  - [ ] Input validation added
  - [ ] CORS properly configured
  
- [ ] **Monitoring**
  - [ ] Metrics collection
  - [ ] Error tracking (Sentry)
  - [ ] Performance monitoring
  - [ ] Alerting configured

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Model Loading Fails**
   ```bash
   # Check model path and permissions
   ls -la models/
   # Verify TensorFlow installation
   python -c "import tensorflow as tf; print(tf.__version__)"
   ```

2. **Supabase Connection Issues**
   ```bash
   # Test connection
   curl -H "apikey: YOUR_ANON_KEY" \
        -H "Authorization: Bearer YOUR_ANON_KEY" \
        https://YOUR_PROJECT.supabase.co/rest/v1/parts
   ```

3. **Memory Issues**
   ```bash
   # Monitor memory usage
   docker stats
   # Adjust model batch size
   # Use model quantization
   ```

This setup provides a production-ready foundation for your AI Part Finder backend. Start with Phase 1 and gradually implement each phase based on your requirements! 