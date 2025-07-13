const axios = require('axios');
const BASE_URL = 'http://localhost:4000';

async function testHealthEndpoints() {
  console.log('🏥 Testing Health Endpoints...\n');

  const endpoints = [
    { name: 'Comprehensive Health Check', url: '/health' },
    { name: 'Simple Health Check', url: '/health/simple' },
    { name: 'Database Health Check', url: '/health/database' },
    { name: 'AI Service Health Check', url: '/health/ai-service' },
    { name: 'Storage Health Check', url: '/health/storage' }
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Testing ${endpoint.name}...`);
      const startTime = Date.now();
      
      const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
        timeout: 10000,
        validateStatus: (status) => status < 600 // Accept any status code
      });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`✅ ${endpoint.name}:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response Time: ${responseTime}ms`);
      
      if (response.data.status) {
        console.log(`   Health Status: ${response.data.status}`);
      }
      
      if (response.data.services) {
        console.log(`   Services:`);
        Object.entries(response.data.services).forEach(([service, health]) => {
          console.log(`     - ${service}: ${health.status}${health.responseTime ? ` (${health.responseTime}ms)` : ''}`);
          if (health.error) {
            console.log(`       Error: ${health.error}`);
          }
        });
      }
      
      if (response.data.system) {
        console.log(`   System:`);
        console.log(`     - Memory: ${response.data.system.memory.used}MB / ${response.data.system.memory.total}MB (${response.data.system.memory.percentage}%)`);
        console.log(`     - Uptime: ${response.data.uptime}s`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ ${endpoint.name} failed:`);
      
      if (axios.isAxiosError(error)) {
        console.error(`   Status: ${error.response?.status || 'No response'}`);
        console.error(`   Message: ${error.message}`);
        
        if (error.response?.data) {
          console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
        }
      } else {
        console.error(`   Error: ${error.message}`);
      }
      console.log('');
    }
  }
  
  console.log('🎯 Health endpoint testing completed!');
}

// Test if server is running first
async function checkServerRunning() {
  try {
    await axios.get(`${BASE_URL}/health/simple`, { timeout: 3000 });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 Starting health endpoint tests...\n');
  
  const isRunning = await checkServerRunning();
  
  if (!isRunning) {
    console.error('❌ Backend server is not running!');
    console.log('💡 Please start the backend server first:');
    console.log('   cd backend && npm run dev');
    process.exit(1);
  }
  
  await testHealthEndpoints();
}

main().catch(console.error); 