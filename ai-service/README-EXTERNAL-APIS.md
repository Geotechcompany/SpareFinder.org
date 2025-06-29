# AI Part Finder Service - GPT-4 Vision + Web Scraping

This advanced AI service combines GPT-4 Vision for accurate automotive part identification with multi-site web scraping for real market data and pricing information.

## 🚀 Key Features

### 🧠 GPT-4 Vision AI
- **Advanced Part Recognition**: Leverages OpenAI's GPT-4 Vision for state-of-the-art image analysis
- **Context-Aware Identification**: Understands automotive context and part relationships
- **Detailed Descriptions**: Generates comprehensive part descriptions and specifications
- **Part Number Generation**: Creates realistic automotive part numbers
- **Category Classification**: Assigns parts to appropriate automotive systems

### 🕷️ Multi-Site Web Scraping
- **Real Market Data**: Scrapes live pricing and availability from major automotive websites
- **Price Comparison**: Aggregates prices across multiple retailers
- **Part Verification**: Validates AI predictions against real market listings
- **Enhanced Metadata**: Enriches predictions with compatibility information

## 🔧 Supported Automotive Websites

| Site | Country/Region | Scraping Difficulty | Notes |
|------|----------------|-------------------|-------|
| **eBay Motors** | Global | ✅ Easy | Best for prices and variety |
| **AliExpress Auto Parts** | Global | ⚠️ Moderate | Lots of aftermarket parts |
| **RockAuto** | USA | ✅ Easy | Extensive catalog by vehicle |
| **CarID.com** | USA | ⚠️ Moderate | High-quality aftermarket & OEM |
| **PartsGeek** | USA | ✅ Easy | Aftermarket & replacement |
| **Summit Racing** | USA | ✅ Easy | Performance parts |
| **JEGS** | USA | ✅ Easy | Muscle cars and racing |
| **FCPEuro.com** | USA/EU | ⚠️ Moderate | European car parts (BMW, Audi) |
| **BuyAutoParts.com** | USA | ✅ Easy | Clear prices, large catalog |

## 🚀 API Endpoints

### 🤖 GPT-4 Vision Prediction

#### Basic Prediction
```http
POST /predict
```

**Parameters:**
- `file` (form-data): Image file to analyze
- `confidence_threshold` (query): Minimum confidence (0.0-1.0, default: 0.5)
- `max_predictions` (query): Maximum predictions (1-10, default: 5)
- `include_web_scraping` (query): Include web scraping enhancement (default: true)

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@brake_pad.jpg" \
  "http://localhost:8000/predict?include_web_scraping=true"
```

#### Enhanced Prediction with Web Scraping
```http
POST /predict/image
```

**Parameters:**
- `file` (form-data): Image file to analyze
- `confidence_threshold` (query): Minimum confidence (0.0-1.0, default: 0.5)
- `include_web_scraping` (query): Include web scraping (default: true)
- `max_scraping_sites` (query): Max sites to scrape (1-5, default: 3)

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@engine_part.jpg" \
  "http://localhost:8000/predict/image?include_web_scraping=true&max_scraping_sites=5"
```

### 🕷️ Web Scraping

#### Direct Part Search
```http
POST /parts/search/scrape
```

**Parameters:**
- `part_name` (query): Part name to search for (min 3 chars)
- `max_sites` (query): Maximum sites to scrape (1-10, default: 5)

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/parts/search/scrape?part_name=brake%20pads&max_sites=3"
```

### 📦 Batch Processing
```http
POST /predict/batch
```

**Parameters:**
- `files` (form-data): Multiple image files
- `confidence_threshold` (query): Minimum confidence (default: 0.5)
- `include_web_scraping` (query): Include scraping (slower, default: false)

## 📊 Response Format

### Enhanced Prediction Response
```json
{
  "request_id": "enhanced_gpt4_req_1704067200000",
  "processing_time": 3.45,
  "model_version": "gpt-4-vision-preview",
  "enhancement_type": "GPT-4 Vision + Web Scraping",
  "predictions": [
    {
      "class_name": "Brake Pad Set",
      "confidence": 0.92,
      "part_number": "AP4A3B2C-123",
      "description": "Front disc brake pads with ceramic compound for enhanced stopping power",
      "category": "Braking System",
      "manufacturer": "Bosch",
      "estimated_price": "$45-120",
      "compatibility": ["Toyota Camry 2018-2023", "Honda Accord 2019-2023"],
      "market_validation": {
        "market_validated": true,
        "real_listings_found": 8,
        "price_data_points": 6,
        "verified_brands": 3
      }
    }
  ]
}
```

### Web Scraping Response
```json
{
  "request_id": "scrape_req_1704067200000",
  "part_name": "brake pads",
  "total_results": 12,
  "processing_time": 8.3,
  "results": [
    {
      "title": "Ceramic Brake Pads Set - Front",
      "price": 89.99,
      "raw_price": "$89.99",
      "link": "https://example.com/brake-pads",
      "source": "rockauto.com",
      "part_number": "D1234-567",
      "brand": "Wagner",
      "image_url": "https://example.com/image.jpg",
      "relevance_score": 0.85
    }
  ],
  "metadata": {
    "sites_scraped": 5,
    "scraping_enabled": true,
    "timestamp": 1704067200
  }
}
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `ai-service` directory:

```env
# Core Configuration
API_KEY=your-secure-api-key-here

# GPT-4 Vision Configuration
GPT_4_API_KEY=sk-your-openai-api-key-here

# Web Scraping Configuration
WEB_SCRAPING_ENABLED=true
MAX_SCRAPING_SITES=5
SCRAPING_DELAY=2.0

# Processing Configuration
MAX_FILE_SIZE_MB=10
BATCH_SIZE_LIMIT=10
DEFAULT_CONFIDENCE_THRESHOLD=0.5

# Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Optional: Google Search API (for additional validation)
GOOGLE_API_KEY=your-google-api-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id

# Optional: External APIs (currently disabled)
OCTOPART_API_KEY=your-octopart-api-key
MOUSER_API_KEY=your-mouser-api-key
```

### Rate Limiting & Performance

- **GPT-4 Vision**: Managed by OpenAI's rate limits
- **Web Scraping**: 2-5 second delays between requests (configurable)
- **Concurrent Processing**: Supports batch processing with controlled concurrency
- **Caching**: Intelligent caching of GPT-4 responses and scraping results

## 🔐 Authentication

All endpoints require API key authentication via Bearer token:

```http
Authorization: Bearer YOUR_API_KEY
```

## 🔄 Enhanced Workflow

1. **Image Upload**: User uploads automotive part image
2. **GPT-4 Vision Analysis**: Advanced AI analyzes image with context awareness
3. **Part Identification**: AI identifies part with detailed specifications
4. **Web Scraping Enhancement**: Optionally scrapes automotive websites for real data
5. **Data Enrichment**: Combines AI predictions with market data
6. **Market Validation**: Validates predictions against real listings
7. **Enhanced Response**: Returns comprehensive part information with pricing

## 📈 Performance Features

- **GPT-4 Vision**: State-of-the-art image understanding
- **Parallel Web Scraping**: Multiple sites scraped simultaneously
- **Intelligent Caching**: Reduces API calls and improves speed
- **Result Deduplication**: Automatic filtering of duplicate results
- **Confidence Scoring**: AI and market confidence combined
- **Chrome/Selenium Support**: Handles JavaScript-heavy sites

## 🛠️ Development

### Local Development Setup

1. **Install Dependencies**:
```bash
pip install -r requirements.txt
```

2. **Configure Environment**:
```bash
cp env.example .env
# Edit .env with your API keys
```

3. **Start Service**:
```bash
python start.py
```

### Docker Development

```bash
# Build and run with Docker
docker build -t sparefinder-ai .
docker run -p 8000:8000 --env-file .env sparefinder-ai
```

### Testing Web Scraping

```bash
# Test scraping configuration
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/scraping/config"

# Test direct scraping
curl -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:8000/parts/search/scrape?part_name=oil%20filter&max_sites=2"
```

## 📋 Best Practices

### API Usage
1. **Rate Limiting**: Monitor GPT-4 API usage to stay within limits
2. **Image Quality**: Use high-resolution images for better GPT-4 results
3. **Batch Processing**: Use batch endpoints for multiple images
4. **Web Scraping**: Use responsibly with appropriate delays

### Performance Optimization
1. **Caching**: Enable caching for repeated requests
2. **Concurrent Limits**: Adjust based on your infrastructure
3. **Scraping Sites**: Start with fewer sites, increase as needed
4. **Monitoring**: Use Prometheus metrics for performance tracking

## 🆘 Troubleshooting

### Common Issues

1. **GPT-4 API Errors**:
   - Check API key validity
   - Monitor rate limits and usage
   - Verify image format and size

2. **Web Scraping Failures**:
   - Check network connectivity
   - Verify Chrome/ChromeDriver installation
   - Adjust delays for rate limiting

3. **Performance Issues**:
   - Reduce max scraping sites
   - Increase delays between requests
   - Monitor system resources

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=DEBUG
```

This provides detailed logs of all GPT-4 API calls and web scraping operations.

## 🔮 Future Enhancements

- **Multi-language Support**: Extend to non-English automotive sites
- **Advanced Filtering**: More sophisticated result filtering
- **Price History**: Track pricing trends over time
- **Part Compatibility**: Enhanced vehicle compatibility detection
- **Custom Models**: Fine-tuned models for specific part categories 