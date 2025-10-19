const axios = require('axios');

async function testSubscribersAPI() {
  try {
    // You'll need to get a valid admin token first
    console.log('🔍 Testing subscribers API...');
    
    // First, let's try to get a token by logging in
    const loginResponse = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'gaudia@bqitech.com',
      password: 'admin123' // or whatever the admin password is
    });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.token;
      console.log('✅ Login successful, token obtained');
      
      // Now test the subscribers API
      const subscribersResponse = await axios.get('http://localhost:4000/api/admin/subscribers?page=1&limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📊 Subscribers API Response:');
      console.log('Success:', subscribersResponse.data.success);
      console.log('Total subscribers:', subscribersResponse.data.data?.subscribers?.length || 0);
      console.log('Pagination:', subscribersResponse.data.data?.pagination);
      console.log('Statistics:', subscribersResponse.data.data?.statistics);
      
      if (subscribersResponse.data.data?.subscribers) {
        console.log('📋 Subscribers list:');
        subscribersResponse.data.data.subscribers.forEach((sub, index) => {
          console.log(`${index + 1}. ${sub.profiles?.full_name} (${sub.profiles?.email}) - ${sub.tier} - ${sub.status}`);
        });
      }
    } else {
      console.log('❌ Login failed:', loginResponse.data);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
}

testSubscribersAPI();
