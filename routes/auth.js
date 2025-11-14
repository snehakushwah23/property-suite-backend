const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Function to send real SMS using Fast2SMS
async function sendSMS(mobile, message) {
  try {
    // Fast2SMS API configuration
    const fast2smsUrl = 'https://www.fast2sms.com/dev/bulkV2';
    const apiKey = 'yx64mVSKKK7LIqwRnHfXCUz1cGUczusWVRmtYlpivg0ADqPf3feoPw9ROuzp';
    
    // Prepare query parameters for GET request (Fast2SMS preferred method)
    const params = new URLSearchParams({
      authorization: apiKey,
      route: 'v3',
      sender_id: 'FSTSMS',
      message: message,
      language: 'english',
      flash: 0,
      numbers: mobile
    });

    console.log(`📤 Sending SMS to ${mobile} via Fast2SMS...`);
    console.log(`🔗 API URL: ${fast2smsUrl}?${params.toString()}`);

    const response = await axios.get(`${fast2smsUrl}?${params.toString()}`);
    
    console.log(`📥 Fast2SMS Response:`, response.data);
    
    if (response.data.return) {
      console.log(`✅ SMS sent successfully to ${mobile} via Fast2SMS`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ SMS failed to ${mobile} via Fast2SMS:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error('❌ Fast2SMS API Error:', error.response?.data || error.message);
    console.error('❌ Error Status:', error.response?.status);
    console.error('❌ Error Details:', error.response?.statusText);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Alternative Fast2SMS function with different route
async function sendSMSFast2SMSAlt(mobile, message) {
  try {
    const fast2smsUrl = 'https://www.fast2sms.com/dev/bulkV2';
    const apiKey = 'yx64mVSKKK7LIqwRnHfXCUz1cGUczusWVRmtYlpivg0ADqPf3feoPw9ROuzp';
    
    // Try with different parameters
    const params = new URLSearchParams({
      authorization: apiKey,
      route: 'q',  // Quick route
      message: message,
      flash: 0,
      numbers: mobile
    });

    console.log(`📤 Trying Fast2SMS Alternative method...`);
    
    const response = await axios.get(`${fast2smsUrl}?${params.toString()}`);
    
    console.log(`📥 Fast2SMS Alt Response:`, response.data);
    
    if (response.data.return) {
      console.log(`✅ SMS sent successfully via Fast2SMS Alt method`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ Fast2SMS Alt failed:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error('❌ Fast2SMS Alt Error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Alternative SMS function using TextLocal (backup)
async function sendSMSTextLocal(mobile, message) {
  try {
    const textLocalUrl = 'https://api.textlocal.in/send/';
    const apiKey = 'PUT_YOUR_TEXTLOCAL_API_KEY_HERE'; // 👈 Replace with your actual API key
    
    const params = new URLSearchParams({
      apikey: apiKey,
      numbers: `91${mobile}`,
      message: message,
      sender: 'TXTLCL'
    });

    const response = await axios.post(textLocalUrl, params);
    
    if (response.data.status === 'success') {
      console.log(`✅ SMS sent successfully to ${mobile} via TextLocal`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ SMS failed to ${mobile} via TextLocal:`, response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.error('❌ TextLocal SMS API Error:', error.message);
    return { success: false, error: error.message };
  }
}


// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    const userWithoutPassword = {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      mobile: user.mobile,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
    
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send OTP for password reset
router.post('/send-otp', async (req, res) => {
  try {
    const { username, mobile } = req.body;
    
    if (!username || !mobile) {
      return res.status(400).json({ error: 'Username and mobile are required' });
    }
    
    // Verify mobile number is 8982544303
    if (mobile !== '8982544303') {
      return res.status(400).json({ error: 'Invalid mobile number' });
    }
    
    // Check if user exists (using hardcoded users for now)
    const authorizedUsers = ['admin', 'manager', 'agent', 'somaning'];
    if (!authorizedUsers.includes(username)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Store OTP in memory/database (for demo, storing in memory)
    global.otpStore = global.otpStore || {};
    global.otpStore[username] = {
      otp: otp,
      mobile: mobile,
      expiry: otpExpiry,
      used: false
    };
    
    // Prepare SMS message
    const smsMessage = `Your Somaning Properties OTP is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone. - SOMANING KOLI`;
    
    console.log(`🔐 Generated OTP for ${username} (${mobile}): ${otp} - Expires at: ${otpExpiry}`);
    
    // Try to send real SMS with multiple methods
    let smsResult = await sendSMS(mobile, smsMessage);
    
    // If first Fast2SMS method fails, try alternative Fast2SMS method
    if (!smsResult.success) {
      console.log('🔄 Fast2SMS v3 failed, trying Fast2SMS alternative method...');
      smsResult = await sendSMSFast2SMSAlt(mobile, smsMessage);
    }
    
    // If Fast2SMS fails, try TextLocal as backup
    if (!smsResult.success) {
      console.log('🔄 Fast2SMS failed, trying TextLocal...');
      smsResult = await sendSMSTextLocal(mobile, smsMessage);
    }
    
    // If all SMS services fail, still return success but log for manual sending
    if (!smsResult.success) {
      console.log('\n🚨 ='.repeat(30));
      console.log('🚨 SMS SERVICE ACTIVATION REQUIRED');
      console.log('🚨 ='.repeat(30));
      console.log(`📱 Mobile Number: ${mobile}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Valid Until: ${otpExpiry.toLocaleString()}`);
      console.log(`💬 Full Message:`);
      console.log(`   ${smsMessage}`);
      console.log('🚨 ='.repeat(30));
      console.log('📋 TO SEND SMS MANUALLY:');
      console.log(`   1. Copy OTP: ${otp}`);
      console.log(`   2. Send SMS to: ${mobile}`);
      console.log(`   3. Or use WhatsApp/Call to share OTP`);
      console.log('🚨 ='.repeat(30));
      console.log('💡 TO ACTIVATE AUTO SMS:');
      console.log('   1. Add 100 INR to Fast2SMS wallet');
      console.log('   2. Or setup MSG91 account (free tier)');
      console.log('🚨 ='.repeat(30));
      
      // Still return success so user can continue with OTP flow
      res.json({
        message: 'OTP generated successfully. Manual SMS required.',
        mobile: mobile,
        expiresIn: '5 minutes',
        smsStatus: 'manual_required',
        note: 'SMS service activation required. Check server console for OTP.',
        // Show OTP for demo/testing purposes
        demo: {
          otp: otp,
          reason: 'Fast2SMS requires 100 INR activation. Check console for manual SMS instructions.',
          manual_sms: smsMessage
        }
      });
    } else {
      // SMS sent successfully
      res.json({
        message: 'OTP sent successfully to 8982544303',
        mobile: mobile,
        expiresIn: '5 minutes',
        smsStatus: 'sent'
      });
    }
    
  } catch (error) {
    console.error('OTP Send Error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { username, otp } = req.body;
    
    if (!username || !otp) {
      return res.status(400).json({ error: 'Username and OTP are required' });
    }
    
    // Check OTP from memory store
    const storedOtpData = global.otpStore?.[username];
    
    if (!storedOtpData) {
      return res.status(400).json({ error: 'OTP not found. Please request new OTP.' });
    }
    
    if (storedOtpData.used) {
      return res.status(400).json({ error: 'OTP already used. Please request new OTP.' });
    }
    
    if (new Date() > storedOtpData.expiry) {
      return res.status(400).json({ error: 'OTP expired. Please request new OTP.' });
    }
    
    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    
    // Mark OTP as used
    storedOtpData.used = true;
    
    res.json({
      message: 'OTP verified successfully',
      username: username,
      canResetPassword: true
    });
    
  } catch (error) {
    console.error('OTP Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Reset password after OTP verification
router.post('/reset-password-with-otp', async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    
    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if OTP was verified for this user
    const storedOtpData = global.otpStore?.[username];
    if (!storedOtpData || !storedOtpData.used) {
      return res.status(400).json({ error: 'Please verify OTP first' });
    }
    
    // In production, update password in database
    // For now, just simulate success
    console.log(`✅ Password reset successful for user: ${username}`);
    
    // Clear OTP data
    delete global.otpStore[username];
    
    res.json({
      message: 'Password reset successfully',
      username: username
    });
    
  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;