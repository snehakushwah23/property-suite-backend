// Test script for PropertySuite Backend API - Employee Module
// Run this with: node test-api.js

const baseURL = 'http://localhost:5001/api'; // Updated to test server port

async function testEndpoint(endpoint, method = 'GET', data = null, token = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${baseURL}${endpoint}`, options);
    const result = await response.json();
    
    console.log(`✅ ${method} ${endpoint}:`, response.status);
    if (response.status >= 400) {
      console.log('   Error:', result);
    } else {
      console.log('   Success:', Object.keys(result));
    }
    
    return { response, result };
  } catch (error) {
    console.log(`❌ ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing PropertySuite Backend API\n');

  // Test health endpoint
  await testEndpoint('/health');

  // Test login
  console.log('\n🔐 Testing Authentication...');
  const loginResult = await testEndpoint('/auth/login', 'POST', {
    username: 'admin',
    password: 'admin@123'
  });

  let token = null;
  if (loginResult && loginResult.result.token) {
    token = loginResult.result.token;
    console.log('   Token received ✅');
  }

  if (token) {
    // Test protected endpoints
    console.log('\n📊 Testing Protected Endpoints...');
    await testEndpoint('/dashboard/stats', 'GET', null, token);
    await testEndpoint('/users', 'GET', null, token);
    await testEndpoint('/agents', 'GET', null, token);
    await testEndpoint('/plots', 'GET', null, token);
  }

  console.log('\n✅ API Testing Complete!');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires Node.js 18+ or install node-fetch');
  console.log('   Try: npm install node-fetch@2');
  process.exit(1);
} else {
  runTests().catch(console.error);
}