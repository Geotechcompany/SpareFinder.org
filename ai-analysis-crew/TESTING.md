# API Testing Guide

## ✅ Test Results

### 1. Root Endpoint
```bash
curl http://localhost:8000/
```
**Response:**
```json
{"message":"AI Spare Part Analyzer API"}
```
✅ **WORKING**

### 2. Health Check Endpoint
```bash
curl http://localhost:8000/health
```
**Response:**
```json
{"status":"healthy"}
```
✅ **WORKING**

## Complete cURL Commands

### Test with Keywords Only
```bash
curl -X POST http://localhost:8000/analyze-part \
  -F "user_email=test@example.com" \
  -F "keywords=Toyota Camry 2015 front brake pad ceramic"
```

### Test with Image File
```bash
curl -X POST http://localhost:8000/analyze-part \
  -F "user_email=test@example.com" \
  -F "keywords=brake pad" \
  -F "file=@/path/to/image.jpg"
```

### Windows PowerShell Alternative
```powershell
# Test root endpoint
Invoke-RestMethod -Uri "http://localhost:8000/" -Method Get

# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
```

## WebSocket Testing

For WebSocket testing, you can use:
1. **Browser Console** (see frontend)
2. **wscat tool**: `npm install -g wscat`
   ```bash
   wscat -c ws://localhost:8000/ws/progress
   ```

## Expected Behavior

- `/` → Returns API name
- `/health` → Returns health status
- `/analyze-part` → Starts analysis, returns confirmation
- `/ws/progress` → WebSocket for real-time updates

## Next Steps

1. ✅ Backend API is running and responding
2. 🔄 Start frontend to test full workflow
3. 🔄 Connect to WebSocket for real-time updates
4. 🔄 Upload image or enter keywords
5. 🔄 Receive PDF report via email

