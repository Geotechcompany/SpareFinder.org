const axios = require('axios');

const diagnoseDashboard = async () => {
    console.log('🔍 Diagnosing Dashboard Data Issues...\n');

    // Test 1: Check backend connectivity
    console.log('1️⃣ Testing Backend Connectivity...');
    try {
        const healthCheck = await axios.get('http://localhost:4000/api/upload/status');
        console.log('✅ Backend is accessible');
        console.log('   Response:', healthCheck.data);
    } catch (error) {
        console.log('❌ Backend connectivity issue:', error.message);
        return;
    }

    // Test 2: Check if we can save test data (with auth token)
    console.log('\n2️⃣ Testing Data Save...');

    // You'll need to replace this with a real auth token from your browser
    // Open browser dev tools -> Application -> Session Storage -> auth_token
    const testToken = 'YOUR_AUTH_TOKEN_HERE'; // Replace with real token

    if (testToken === 'YOUR_AUTH_TOKEN_HERE') {
        console.log('⚠️  Please replace testToken with real auth token from browser');
        console.log('   1. Open browser dev tools (F12)');
        console.log('   2. Go to Application -> Session Storage');
        console.log('   3. Find auth_token value');
        console.log('   4. Replace testToken in this script');
        return;
    }

    const testUploadData = {
        success: true,
        predictions: [{
            class_name: "Test Dashboard Part",
            confidence: 0.95,
            description: "Test part for dashboard debugging",
            category: "Testing",
            manufacturer: "Test Manufacturer",
            estimated_price: {
                new: "$100 - $200",
                used: "$50 - $100",
                refurbished: "$75 - $150"
            }
        }],
        model_version: "debug-v1.0",
        processing_time: 3.5,
        image_metadata: {
            content_type: "image/jpeg",
            size_bytes: 500000
        },
        metadata: {
            flat_data: {
                class_name: "Test Dashboard Part",
                category: "Testing",
                estimated_price: {
                    new: "$100 - $200",
                    used: "$50 - $100",
                    refurbished: "$75 - $150"
                }
            }
        }
    };

    try {
        const saveResponse = await axios.post('http://localhost:4000/api/upload/save-results', testUploadData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            }
        });
        console.log('✅ Test data saved successfully');
        console.log('   Response:', saveResponse.data);
    } catch (error) {
        console.log('❌ Test data save failed:', error.response ? error.response.status : 'unknown', error.response ? error.response.data : error.message);
        if (error.response && error.response.status === 401) {
            console.log('   Authentication failed - check your token');
        }
        return;
    }

    // Test 3: Check dashboard stats endpoint
    console.log('\n3️⃣ Testing Dashboard Stats...');
    try {
        const statsResponse = await axios.get('http://localhost:4000/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        console.log('✅ Dashboard stats fetched successfully');
        console.log('   Stats:', JSON.stringify(statsResponse.data, null, 2));
    } catch (error) {
        console.log('❌ Dashboard stats failed:', error.response ? error.response.status : 'unknown', error.response ? error.response.data : error.message);
    }

    // Test 4: Check recent uploads
    console.log('\n4️⃣ Testing Recent Uploads...');
    try {
        const uploadsResponse = await axios.get('http://localhost:4000/api/dashboard/recent-uploads', {
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        });
        console.log('✅ Recent uploads fetched successfully');
        console.log('   Uploads:', JSON.stringify(uploadsResponse.data, null, 2));
    } catch (error) {
        console.log('❌ Recent uploads failed:', error.response ? error.response.status : 'unknown', error.response ? error.response.data : error.message);
    }

    console.log('\n📋 Diagnosis Complete!');
    console.log('If all tests pass but dashboard still shows zeros:');
    console.log('1. Check browser console for frontend errors');
    console.log('2. Verify user ID matches between saved data and dashboard queries');
    console.log('3. Check if frontend is calling the correct API endpoints');
};

diagnoseDashboard().catch(console.error);