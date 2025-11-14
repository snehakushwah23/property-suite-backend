const axios = require('axios');

async function testFast2SMS() {
  const apiKey = 'yx64mVSKKK7LIqwRnHfXCUz1cGUczusWVRmtYlpivg0ADqPf3feoPw9ROuzp';
  const mobile = '8982544303';
  const message = 'Test OTP: 123456. Valid for 5 minutes. - SOMANING KOLI';

  console.log('🧪 Testing Fast2SMS API...');
  console.log(`📱 Mobile: ${mobile}`);
  console.log(`💬 Message: ${message}`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);

  // Method 1: v3 route with sender_id
  try {
    console.log('\n📤 Method 1: v3 route with FSTSMS sender...');
    const params1 = new URLSearchParams({
      authorization: apiKey,
      route: 'v3',
      sender_id: 'FSTSMS',
      message: message,
      language: 'english',
      flash: 0,
      numbers: mobile
    });

    const url1 = `https://www.fast2sms.com/dev/bulkV2?${params1.toString()}`;
    console.log(`🔗 URL: ${url1}`);
    
    const response1 = await axios.get(url1);
    console.log('✅ Method 1 Response:', response1.data);
    
    if (response1.data.return) {
      console.log('🎉 SMS sent successfully with Method 1!');
      return;
    }
  } catch (error) {
    console.log('❌ Method 1 failed:', error.response?.data || error.message);
  }

  // Method 2: q route (quick)
  try {
    console.log('\n📤 Method 2: q route (quick)...');
    const params2 = new URLSearchParams({
      authorization: apiKey,
      route: 'q',
      message: message,
      flash: 0,
      numbers: mobile
    });

    const url2 = `https://www.fast2sms.com/dev/bulkV2?${params2.toString()}`;
    console.log(`🔗 URL: ${url2}`);
    
    const response2 = await axios.get(url2);
    console.log('✅ Method 2 Response:', response2.data);
    
    if (response2.data.return) {
      console.log('🎉 SMS sent successfully with Method 2!');
      return;
    }
  } catch (error) {
    console.log('❌ Method 2 failed:', error.response?.data || error.message);
  }

  // Method 3: dlt route
  try {
    console.log('\n📤 Method 3: dlt route...');
    const params3 = new URLSearchParams({
      authorization: apiKey,
      route: 'dlt',
      sender_id: 'FSTSMS',
      message: message,
      variables_values: '123456',
      route: 'otp',
      numbers: mobile
    });

    const url3 = `https://www.fast2sms.com/dev/bulkV2?${params3.toString()}`;
    console.log(`🔗 URL: ${url3}`);
    
    const response3 = await axios.get(url3);
    console.log('✅ Method 3 Response:', response3.data);
    
    if (response3.data.return) {
      console.log('🎉 SMS sent successfully with Method 3!');
      return;
    }
  } catch (error) {
    console.log('❌ Method 3 failed:', error.response?.data || error.message);
  }

  console.log('\n❌ All methods failed. Please check:');
  console.log('1. API key validity');
  console.log('2. Account balance');
  console.log('3. Mobile number format');
  console.log('4. Message content compliance');
}

testFast2SMS().catch(console.error);