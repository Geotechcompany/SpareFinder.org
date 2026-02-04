const axios = require('axios');

async function testSubscribers() {
  try {
    console.log('🔐 Logging in to get token...');
    
    // Login to get token
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'gaudia@bqitech.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Test subscribers endpoint
    console.log('📊 Testing subscribers endpoint...');
    const subscribersResponse = await axios.get('http://localhost:4000/api/admin/subscribers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Subscribers endpoint working!');
    console.log('📊 Response:', JSON.stringify(subscribersResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSubscribers();
