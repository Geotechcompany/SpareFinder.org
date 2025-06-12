# External Part Database API Integration (Simplified)

This AI service includes simplified integration with essential external databases for enhanced part identification and sourcing capabilities.

## 🔌 Supported Providers

### 1. **Octopart/Nexar API**
- **Description**: Comprehensive electronic component database
- **Free Tier**: 1,000 requests/month
- **Sign Up**: https://portal.nexar.com/sign-up
- **Features**: Part specifications, pricing, availability, datasheets
- **Environment Variable**: `OCTOPART_API_KEY`

### 2. **Mouser API**
- **Description**: Global electronic component distributor
- **Free Tier**: Available
- **Sign Up**: https://www.mouser.com/api-hub/
- **Features**: Part search, pricing, stock levels
- **Environment Variable**: `MOUSER_API_KEY`

### 3. **Google Custom Search API**
- **Description**: Fallback search for part information
- **Free Tier**: 100 searches/day
- **Setup**: https://developers.google.com/custom-search/v1/introduction
- **Features**: Web search for part descriptions and details
- **Environment Variables**: 
  - `GOOGLE_API_KEY`
  - `GOOGLE_SEARCH_ENGINE_ID`

## 🚀 API Endpoints

### Part Search by Number
```http
GET /parts/search/number/{part_number}
```

**Parameters:**
- `part_number` (path): The part number to search for
- `providers` (query): List of providers ("octopart", "mouser")
- `limit` (query): Maximum results per provider (1-50, default: 10)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/parts/search/number/LM358?providers=octopart,mouser&limit=5"
```

### Part Search by Description
```http
GET /parts/search/description
```

**Parameters:**
- `description` (query): Part description or keywords (min 3 chars)
- `category` (query): Optional part category filter
- `providers` (query): List of providers ("octopart", "mouser")
- `limit` (query): Maximum results per provider (1-50, default: 10)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/parts/search/description?description=operational%20amplifier&category=IC"
```

### Part Details
```http
GET /parts/details/{part_number}
```

**Parameters:**
- `part_number` (path): The part number
- `manufacturer` (query): Optional manufacturer filter
- `provider` (query): Specific provider ("octopart" or "mouser")

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/parts/details/LM358?manufacturer=Texas%20Instruments"
```

### Available Providers
```http
GET /providers
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/providers"
```

### Enhanced AI Prediction with External Search
```http
POST /predict/image
```

**Parameters:**
- `file` (form-data): Image file to analyze
- `confidence_threshold` (query): Minimum confidence (0.0-1.0, default: 0.5)
- `include_external_search` (query): Include external DB search (default: true)

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@part_image.jpg" \
  "http://localhost:8000/predict/image?include_external_search=true"
```

## 📊 Response Format

All endpoints return standardized part information:

```json
{
  "part_number": "LM358",
  "manufacturer": "Texas Instruments",
  "description": "Dual Operational Amplifier",
  "category": "Linear ICs",
  "specifications": {
    "Supply Voltage": "3V to 32V",
    "Package": "DIP-8, SOIC-8",
    "Temperature Range": "-40°C to +85°C"
  },
  "availability": {
    "Mouser": 8500,
    "Octopart": 15000
  },
  "pricing": [
    {
      "quantity": 1,
      "price": 0.45,
      "currency": "USD"
    },
    {
      "quantity": 100,
      "price": 0.32,
      "currency": "USD"
    }
  ],
  "datasheets": [
    "https://www.ti.com/lit/ds/symlink/lm358.pdf"
  ],
  "images": [
    "https://example.com/lm358.jpg"
  ],
  "supplier": "Mouser",
  "supplier_part_number": "595-LM358N",
  "lifecycle_status": "Active",
  "confidence_score": 0.95,
  "last_updated": "2024-01-15T10:30:00Z"
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `ai-service` directory:

```env
# Core Configuration
API_KEY=your-secure-api-key-here

# TensorFlow AI Model
MODEL_TYPE=mobilenet_v2
MODEL_PATH=/app/models/mobilenet_v2

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# External API Keys (Simplified)
OCTOPART_API_KEY=your-octopart-nexar-api-key
MOUSER_API_KEY=your-mouser-api-key
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
```

### Rate Limiting

Each provider has built-in rate limiting:
- **Octopart**: 1,000 requests/hour
- **Mouser**: 1,000 requests/hour
- **Google Search**: 100 searches/day

Rate limits are automatically managed by the service.

## 🔐 Authentication

All endpoints require API key authentication via Bearer token:

```http
Authorization: Bearer YOUR_API_KEY
```

## 🔄 Integration Workflow

1. **Image Upload**: User uploads part image
2. **TensorFlow Analysis**: Image analyzed using TensorFlow models
3. **Part Identification**: AI predicts part number and category
4. **External Search**: Predicted parts searched across Octopart and Mouser
5. **Google Fallback**: If no results, use Google Custom Search
6. **Data Enrichment**: Results enhanced with pricing, availability, specs
7. **Response**: Combined AI + external data returned to user

## 📈 Performance Features

- **TensorFlow Models**: MobileNetV2, EfficientNet support
- **Parallel Searches**: Octopart and Mouser queried simultaneously
- **Caching**: Results cached to reduce API calls
- **Deduplication**: Duplicate results filtered automatically
- **Confidence Scoring**: Results ranked by confidence
- **Google Fallback**: Custom search as backup

## 🛠️ Development

### Testing External APIs

Use the health check endpoint to verify API connectivity:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/providers"
```

### TensorFlow Model Support

Supported model types:
- `mobilenet_v2`: MobileNet V2 (default)
- `efficientnet`: EfficientNet B0
- `custom`: Your custom TensorFlow model

## 📋 Best Practices

1. **API Key Security**: Never commit API keys to version control
2. **Rate Limiting**: Monitor usage to stay within limits
3. **TensorFlow Models**: Use appropriate model for your use case
4. **Caching**: Use Redis for better performance
5. **Monitoring**: Monitor API usage and response times

## 🆘 Troubleshooting

### Common Issues

1. **Invalid API Key**: Check environment variables
2. **Rate Limit Exceeded**: Implement backoff strategy
3. **Model Loading Errors**: Check TensorFlow installation
4. **Network Timeouts**: Check internet connectivity

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=DEBUG
```

This provides detailed logs of all external API interactions and TensorFlow operations. 