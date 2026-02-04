# 🔌 WebSocket Testing Guide

## Production WebSocket URL
```
wss://aiagent-sparefinder-org.onrender.com/ws/progress
```

## Testing Methods

### 1. Browser Console Test (Quickest)

Open your browser's developer console (F12) and run:

```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://aiagent-sparefinder-org.onrender.com/ws/progress');

ws.onopen = () => {
  console.log('✅ Connected!');
  
  // Send test message
  ws.send(JSON.stringify({
    email: 'test@example.com',
    keywords: 'brake pad'
  }));
};

ws.onmessage = (event) => {
  console.log('📥 Message received:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('❌ Error:', error);
};

ws.onclose = (event) => {
  console.log('🔌 Closed:', event.code, event.reason);
};
```

### 2. Node.js Test Script

**Prerequisites:**
```bash
npm install ws
```

**Run the test:**
```bash
# Using default settings
node test-websocket.js

# With custom settings
WS_URL=wss://aiagent-sparefinder-org.onrender.com/ws/progress \
TEST_EMAIL=your@email.com \
TEST_KEYWORDS="brake pad front" \
node test-websocket.js
```

### 3. wscat Command-Line Tool

**Install wscat:**
```bash
npm install -g wscat
```

**Connect to WebSocket:**
```bash
wscat -c wss://aiagent-sparefinder-org.onrender.com/ws/progress
```

**Once connected, send a test message:**
```json
{"email":"test@example.com","keywords":"brake pad"}
```

### 4. Online WebSocket Testers

Use these online tools to test the WebSocket:

1. **WebSocket King** (https://websocketking.com/)
   - Enter URL: `wss://aiagent-sparefinder-org.onrender.com/ws/progress`
   - Click "Connect"
   - Send test message

2. **WebSocket.org Echo Test** (https://www.websocket.org/echo.html)
   - Use custom URL: `wss://aiagent-sparefinder-org.onrender.com/ws/progress`

3. **Postman** (Desktop App)
   - Create new WebSocket request
   - Enter URL: `wss://aiagent-sparefinder-org.onrender.com/ws/progress`
   - Connect and send messages

### 5. cURL (for HTTP health check first)

**Test HTTP health endpoint first:**
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{"status":"healthy","service":"AI Spare Part Analyzer API"}
```

### 6. Frontend Application Test

1. Set environment variables in `.env`:
   ```bash
   VITE_AI_CREW_API_URL=http://localhost:8000
   VITE_AI_CREW_WS_URL=wss://aiagent-sparefinder-org.onrender.com
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

3. Navigate to the Upload page
4. Upload an image or enter keywords
5. Start the analysis
6. Check browser console for WebSocket connection logs

## Expected Behavior

### Connection Flow

1. **Connect**: WebSocket connects to `wss://aiagent-sparefinder-org.onrender.com/ws/progress`
2. **Send Request**: Send JSON message with `email` and optional `keywords`/`image`
3. **Receive Updates**: Receive progress updates with structure:
   ```json
   {
     "stage": "image_analysis",
     "message": "Analyzing image...",
     "status": "in_progress",
     "timestamp": 1234567890
   }
   ```
4. **Completion**: Receive final message with `stage: "completion"` or `status: "error"`

### Message Format

**Send (Client → Server):**
```json
{
  "email": "user@example.com",
  "keywords": "brake pad front",
  "image": "base64_encoded_image_string" // optional
}
```

**Receive (Server → Client):**
```json
{
  "stage": "part_identifier",
  "message": "Identifying part...",
  "status": "in_progress",
  "timestamp": 1234567890
}
```

## Troubleshooting

### ❌ Connection Refused

**Symptoms:**
- `WebSocket connection failed`
- `ERR_CONNECTION_REFUSED`

**Solutions:**
1. Verify the URL is correct: `wss://aiagent-sparefinder-org.onrender.com/ws/progress`
2. Check if the server is running
3. Verify firewall/network settings
4. Test HTTP endpoint first: `curl http://localhost:8000/health`

### ❌ SSL Certificate Error

**Symptoms:**
- `SSL handshake failed`
- Certificate validation errors

**Solutions:**
1. Verify SSL certificate is valid: `openssl s_client -connect aiagent-sparefinder-org.onrender.com:443`
2. Check if the domain has a valid certificate
3. Ensure the server supports WSS (not just WS)

### ❌ Timeout

**Symptoms:**
- Connection hangs
- No response after 30 seconds

**Solutions:**
1. Check server logs
2. Verify the WebSocket endpoint is enabled
3. Test with a simpler message first
4. Check network connectivity

### ❌ Invalid Message Format

**Symptoms:**
- Server closes connection immediately
- Error messages about invalid JSON

**Solutions:**
1. Ensure message is valid JSON
2. Include required `email` field
3. Check message structure matches expected format

## Verification Checklist

- [ ] HTTP health endpoint responds: `curl http://localhost:8000/health`
- [ ] WebSocket connects successfully
- [ ] Can send messages without errors
- [ ] Receives progress updates
- [ ] Connection closes properly on completion
- [ ] Error handling works correctly
- [ ] SSL certificate is valid
- [ ] Works from browser console
- [ ] Works from Node.js script
- [ ] Works from frontend application

## Test Results

After testing, document:

1. **Connection Status**: ✅ Success / ❌ Failed
2. **Response Time**: Average connection time
3. **Message Delivery**: Are messages received correctly?
4. **Error Handling**: How are errors handled?
5. **SSL Certificate**: Is it valid?
6. **Server Response**: What messages are received?

## Additional Resources

- [WebSocket API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [wscat GitHub](https://github.com/websockets/wscat)
- [WebSocket Testing Tools](https://www.websocket.org/echo.html)

