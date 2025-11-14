const axios = require('axios');

// Alternative SMS function using MSG91 (Free tier available)
async function sendSMSMSG91(mobile, message) {
  try {
    // MSG91 API - has free tier without initial payment
    const msg91Url = 'https://control.msg91.com/api/sendhttp.php';
    const authKey = 'YOUR_MSG91_AUTH_KEY'; // Get from msg91.com
    
    const params = new URLSearchParams({
      authkey: authKey,
      mobiles: `91${mobile}`,
      message: message,
      sender: 'SOMANG',
      route: '4',
      country: '91'
    });

    console.log(`📤 Sending SMS via MSG91 to ${mobile}...`);
    
    const response = await axios.post(msg91Url, params);
    
    if (response.data.type === 'success') {
      console.log(`✅ SMS sent successfully via MSG91`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ MSG91 failed:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error('❌ MSG91 Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// SMS via Way2SMS (Free but limited)
async function sendSMSWay2SMS(mobile, message) {
  try {
    // Way2SMS alternative
    const way2smsUrl = 'https://www.way2sms.com/api/v1/sendCampaign';
    
    console.log(`📤 Sending SMS via Way2SMS to ${mobile}...`);
    console.log(`💬 Message: ${message}`);
    
    // This requires website login - more complex
    return { success: false, error: 'Way2SMS requires manual website login' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { sendSMSMSG91, sendSMSWay2SMS };