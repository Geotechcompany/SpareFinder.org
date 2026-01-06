# Health Monitoring System

The SpareFinder backend provides comprehensive health monitoring capabilities to ensure system reliability and facilitate debugging.

## Overview

The health monitoring system checks the status of all critical dependencies and provides detailed information about system performance. This is essential for:

- **Production monitoring** - Early detection of issues
- **DevOps integration** - Integration with monitoring tools like UptimeRobot, Pingdom
- **Debugging** - Quick identification of failing components
- **Load balancing** - Health-based routing decisions

## Available Endpoints

### 1. Comprehensive Health Check
**Endpoint:** `GET /health`

**Purpose:** Complete system health overview including all services and system metrics.

**Response Format:**
```json
{
  "status": "healthy" | "unhealthy" | "degraded",
  "timestamp": "ISO 8601 timestamp",
  "version": "application version",
  "environment": "development | production",
  "uptime": 3600,
  "services": {
    "database": { "status": "healthy", "responseTime": 45, "details": {} },
    "ai_service": { "status": "healthy", "responseTime": 123, "details": {} },
    "storage": { "status": "healthy", "responseTime": 67, "details": {} }
  },
  "system": {
    "memory": { "used": 128, "total": 512, "percentage": 25 },
    "cpu": { "usage": "N/A" }
  }
}
```

**HTTP Status Codes:**
- `200` - System is healthy or degraded
- `503` - System is unhealthy

### 2. Simple Health Check
**Endpoint:** `GET /health/simple`

**Purpose:** Fast, lightweight health check with minimal overhead.

**Response Format:**
```json
{
  "status": "healthy",
  "timestamp": "ISO 8601 timestamp",
  "uptime": 3600
}
```

**Use Case:** Perfect for high-frequency monitoring and load balancer health checks.

### 3. Database Health Check
**Endpoint:** `GET /health/database`

**Purpose:** Specifically tests Supabase database connectivity and response time.

**What it checks:**
- Database connection
- Simple query execution
- Response time measurement

**Response Example:**
```json
{
  "service": "database",
  "status": "healthy",
  "responseTime": 45,
  "details": {
    "connection": "active",
    "query": "successful"
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### 4. AI Service Health Check
**Endpoint:** `GET /health/ai-service`

**Purpose:** Tests the external AI service availability and response.

**What it checks:**
- AI service URL configuration
- Network connectivity to AI service
- AI service `/health` endpoint response
- Response time measurement

**Response Example:**
```json
{
  "service": "ai_service",
  "status": "healthy",
  "responseTime": 123,
  "details": {
    "url": "https://ai-sparefinder-com.onrender.com",
    "service": "SpareFinderAI",
    "version": "1.0.0",
    "response_status": 200
  },
  "timestamp": "ISO 8601 timestamp"
}
```

### 5. Storage Health Check
**Endpoint:** `GET /health/storage`

**Purpose:** Tests Supabase storage bucket accessibility.

**What it checks:**
- Storage service connectivity
- Bucket existence verification
- List buckets operation

**Response Example:**
```json
{
  "service": "storage",
  "status": "healthy", 
  "responseTime": 67,
  "details": {
    "bucket": "sparefinder",
    "bucket_exists": true,
    "total_buckets": 2
  },
  "timestamp": "ISO 8601 timestamp"
}
```

## Health Status Levels

### Healthy ✅
- All services are operating normally
- Response times are within acceptable limits
- No errors detected

### Degraded ⚠️
- Some services may have minor issues
- System is functional but performance may be impacted
- Example: AI service responding slowly but working

### Unhealthy ❌
- Critical services are failing
- System may not be functional
- Immediate attention required

## Status Code Logic

The comprehensive health check (`/health`) uses the following logic:

1. **Healthy (200):** All services are healthy
2. **Degraded (200):** Some services are degraded but none are unhealthy
3. **Unhealthy (503):** At least one service is unhealthy

Individual service checks return:
- **200** if the specific service is healthy
- **503** if the specific service is unhealthy or degraded

## Environment Variables

The health checks depend on these environment variables:

```bash
# Required for AI service check
AI_SERVICE_URL=https://ai-sparefinder-com.onrender.com

# Required for database and storage checks
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Optional for storage check (defaults to 'sparefinder')
SUPABASE_BUCKET_NAME=sparefinder
```

## Integration Examples

### UptimeRobot Configuration
```
Monitor Type: HTTP(s)
URL: https://sparefinder-org-pp8y.onrender.com/health/simple
Interval: 5 minutes
HTTP Method: GET
Expected Status: 200
```

### Docker Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health/simple || exit 1
```

### Kubernetes Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /health/database
    port: 4000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health/simple
    port: 4000
  initialDelaySeconds: 60
  periodSeconds: 30
```

## Testing

### Manual Testing
```bash
# Test all endpoints
curl http://localhost:4000/health
curl http://localhost:4000/health/simple
curl http://localhost:4000/health/database
curl http://localhost:4000/health/ai-service
curl http://localhost:4000/health/storage

# Test with detailed output
curl -w "Status: %{http_code}, Time: %{time_total}s\n" \
     http://localhost:4000/health
```

### Automated Testing
```bash
# Run the comprehensive test suite
npm run test:health

# Or run directly
node test-health.js
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Health Check Test
  run: |
    npm run test:health
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
    AI_SERVICE_URL: ${{ secrets.AI_SERVICE_URL }}
```

## Monitoring Best Practices

### 1. Layered Monitoring
- Use `/health/simple` for high-frequency checks (every 1-2 minutes)
- Use `/health` for comprehensive monitoring (every 5-10 minutes)
- Use specific service endpoints for targeted troubleshooting

### 2. Alerting Strategy
- **Critical:** Unhealthy status on `/health`
- **Warning:** Degraded status on `/health` 
- **Info:** Individual service failures for debugging

### 3. Response Time Thresholds
- **Database:** < 100ms (good), < 500ms (acceptable), > 500ms (slow)
- **AI Service:** < 1s (good), < 5s (acceptable), > 5s (slow)
- **Storage:** < 200ms (good), < 1s (acceptable), > 1s (slow)

## Troubleshooting

### Common Issues

#### Database Unhealthy
```json
{
  "status": "unhealthy",
  "error": "relation \"profiles\" does not exist"
}
```
**Solution:** Run database migrations or check Supabase connection

#### AI Service Unavailable
```json
{
  "status": "unhealthy", 
  "error": "AI service URL not configured"
}
```
**Solution:** Set `AI_SERVICE_URL` environment variable

#### Storage Access Issues
```json
{
  "status": "degraded",
  "error": "Bucket 'sparefinder' not found"
}
```
**Solution:** Create the storage bucket in Supabase or check `SUPABASE_BUCKET_NAME`

### Debug Mode

For detailed debugging, check the server logs when health endpoints are called. All health checks include detailed logging:

```
🏥 Health check requested
🏥 Health check completed: healthy (200)
```

## Performance Considerations

- Health checks run in parallel for optimal performance
- Individual service timeouts are set to 5 seconds
- Memory usage monitoring has minimal overhead
- Database queries are lightweight (single record lookup)

## Security

- Health endpoints do not require authentication
- No sensitive data is exposed in responses
- API keys and secrets are not included in health responses
- Only service status and performance metrics are returned

This comprehensive health monitoring system ensures your SpareFinder backend maintains high availability and provides clear insights into system performance. 