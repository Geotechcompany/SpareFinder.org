/**
 * WebSocket Connection Test Script
 * Tests the production WebSocket URL: wss://aiagent.sparefinder.org/ws/progress
 * 
 * Usage:
 *   node test-websocket.js
 */

const WebSocket = require('ws');

// Production WebSocket URL
const WS_URL = process.env.WS_URL || 'wss://aiagent.sparefinder.org/ws/progress';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_KEYWORDS = process.env.TEST_KEYWORDS || 'brake pad';

console.log('🔌 Testing WebSocket Connection...');
console.log(`📍 URL: ${WS_URL}`);
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`🔑 Test Keywords: ${TEST_KEYWORDS}`);
console.log('');

// Create WebSocket connection
const ws = new WebSocket(WS_URL);

// Connection opened
ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('');
  
  // Send test message
  const testMessage = {
    email: TEST_EMAIL,
    keywords: TEST_KEYWORDS,
    // image: base64ImageString (optional)
  };
  
  console.log('📤 Sending test message...');
  console.log(JSON.stringify(testMessage, null, 2));
  console.log('');
  
  ws.send(JSON.stringify(testMessage));
});

// Receive messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message:');
    console.log(JSON.stringify(message, null, 2));
    console.log('');
    
    // Check if analysis is complete
    if (message.stage === 'completion' || message.stage === 'final') {
      console.log('✅ Analysis completed!');
      ws.close();
    } else if (message.status === 'error') {
      console.log('❌ Analysis failed:', message.message);
      ws.close();
    }
  } catch (error) {
    console.log('📥 Received raw message:', data.toString());
  }
});

// Connection error
ws.on('error', (error) => {
  console.error('❌ WebSocket error:');
  console.error(error.message);
  console.error('');
  console.error('💡 Troubleshooting:');
  console.error('  1. Check if the URL is correct: wss://aiagent.sparefinder.org/ws/progress');
  console.error('  2. Verify the server is running and accessible');
  console.error('  3. Check firewall/network settings');
  console.error('  4. Ensure SSL certificate is valid (wss:// requires HTTPS)');
  process.exit(1);
});

// Connection closed
ws.on('close', (code, reason) => {
  console.log('');
  console.log('🔌 WebSocket closed');
  console.log(`   Code: ${code}`);
  console.log(`   Reason: ${reason.toString() || 'No reason provided'}`);
  console.log('');
  
  if (code === 1000) {
    console.log('✅ Normal closure - Test completed successfully');
  } else {
    console.log('⚠️  Unexpected closure - Check server logs');
  }
  
  process.exit(code === 1000 ? 0 : 1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('');
  console.log('🛑 Closing WebSocket connection...');
  ws.close(1000, 'Test terminated by user');
});

// Timeout after 30 seconds if no response
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('');
    console.log('⏱️  Test timeout (30 seconds)');
    ws.close();
  }
}, 30000);

