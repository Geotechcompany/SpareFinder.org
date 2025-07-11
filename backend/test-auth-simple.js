const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';

async function testAuthFlow() {
    console.log('🧪 Testing Authentication Flow...\n');

    try {
        // Test 1: Register a new user
        console.log('1. Testing Registration...');
        const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
            email: 'test@example.com',
            password: 'testpassword123',
            full_name: 'Test User'
        });

        console.log('✅ Registration Response:', {
            success: registerResponse.data.success,
            hasToken: !!registerResponse.data.token,
            hasUser: !!registerResponse.data.user,
            userEmail: registerResponse.data.user ? registerResponse.data.user.email : null
        });

        const token = registerResponse.data.token;
        if (!token) {
            console.error('❌ No token received from registration');
            return;
        }

        // Test 2: Use the token to access protected endpoint
        console.log('\n2. Testing Token Authentication...');
        const currentUserResponse = await axios.get(`${API_BASE_URL}/auth/current-user`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Current User Response:', {
            success: currentUserResponse.data.success,
            userEmail: currentUserResponse.data.data && currentUserResponse.data.data.user ? currentUserResponse.data.data.user.email : null
        });

        // Test 3: Test dashboard endpoint
        console.log('\n3. Testing Dashboard Stats...');
        const dashboardResponse = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Dashboard Response:', {
            success: dashboardResponse.data.success,
            hasData: !!dashboardResponse.data.data
        });

        console.log('\n🎉 All tests passed! Authentication is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', {
            status: error.response ? error.response.status : null,
            statusText: error.response ? error.response.statusText : null,
            data: error.response ? error.response.data : null,
            message: error.message
        });
    }
}

testAuthFlow();