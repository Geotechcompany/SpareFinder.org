const axios = require('axios');

const checkDatabaseData = async () => {
    console.log('🔍 Checking Database Data vs Dashboard Expectations...\n');

    // You need to get your auth token from browser session storage
    const testToken = 'YOUR_AUTH_TOKEN_HERE'; // Replace with real token

    if (testToken === 'YOUR_AUTH_TOKEN_HERE') {
        console.log('⚠️  Please replace testToken with real auth token from browser');
        console.log('   1. Open browser dev tools (F12)');
        console.log('   2. Go to Application -> Session Storage');
        console.log('   3. Find auth_token value');
        console.log('   4. Replace testToken in this script');
        return;
    }

    console.log('1️⃣ Testing dashboard stats endpoint...');
    try {
        const statsResponse = await axios.get('http://localhost:4000/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        console.log('✅ Dashboard stats response:');
        console.log('   ', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
        console.log('❌ Dashboard stats failed:', error.response ? error.response.status : 'unknown');
        console.log('   Error:', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 401) {
            console.log('   Please check your auth token');
            return;
        }
    }

    console.log('\n2️⃣ Testing recent uploads endpoint...');
    try {
        const uploadsResponse = await axios.get('http://localhost:4000/api/dashboard/recent-uploads?limit=10', {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        console.log('✅ Recent uploads response:');
        console.log('   ', JSON.stringify(uploadsResponse.data, null, 2));
    } catch (error) {
        console.log('❌ Recent uploads failed:', error.response ? error.response.status : 'unknown');
        console.log('   Error:', error.response ? error.response.data : error.message);
    }

    console.log('\n📋 Diagnosis Summary:');
    console.log('Based on your Supabase screenshot, I can see data exists in part_searches table.');
    console.log('If stats still show zeros, the likely issues are:');
    console.log('1. User ID mismatch - dashboard queries with different user_id than stored');
    console.log('2. is_match field not set to true (required for "successful uploads")');
    console.log('3. Field name mismatches (processing_time vs processing_time_ms)');
    console.log('4. confidence_score field missing or wrong format');
    console.log('\nCheck the backend console logs for the actual user_id being queried!');
};

checkDatabaseData().catch(console.error);