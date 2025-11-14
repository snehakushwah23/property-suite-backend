# 📱 Real SMS OTP Setup Guide for Somaning Properties

## Current Status
✅ Backend OTP system ready
✅ Frontend integration complete  
✅ Real SMS functions implemented
⚠️ SMS API keys required for live SMS

## How to Enable Real SMS to 8982544303

### Option 1: Fast2SMS (Recommended - Free)
1. Visit: https://www.fast2sms.com/
2. Sign up and verify your account
3. Get free credits (Usually 50-100 SMS free)
4. Copy your API key from dashboard
5. Update `.env` file:
   ```
   FAST2SMS_API_KEY=your_actual_api_key_here
   SMS_ENABLED=true
   ```

### Option 2: TextLocal (Backup)
1. Visit: https://www.textlocal.in/
2. Register account and verify
3. Get API key from settings
4. Update `.env` file with TextLocal credentials

### Option 3: MSG91 (Professional)
1. Visit: https://msg91.com/
2. Sign up for account
3. Get authentication key and template ID
4. Configure in `.env` file

## Current Behavior Without SMS API:
- ✅ OTP generated successfully
- ✅ Stored in backend memory
- ✅ Console logs show OTP (for testing)
- ⚠️ Manual SMS required to 8982544303
- ✅ OTP verification works normally

## Testing Without Real SMS:
1. Enter username in forgot password
2. Click "Send OTP" 
3. Check backend console for generated OTP
4. Manually SMS the OTP to 8982544303
5. User enters OTP from SMS
6. Password reset completes

## File Locations:
- SMS functions: `routes/auth.js`
- Environment config: `.env.sms`
- Frontend integration: `src/pages/Login.js`

## Next Steps:
1. Choose SMS provider (Fast2SMS recommended)
2. Get API credentials
3. Update .env file with real keys
4. Restart backend server
5. Test complete SMS flow

## Security Notes:
- OTP expires in 5 minutes
- Each OTP single use only
- Mobile number 8982544303 hardcoded for security
- Username validation against authorized users only