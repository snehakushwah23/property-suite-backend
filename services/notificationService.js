const axios = require('axios');

class NotificationService {
  constructor() {
    // Configure your WhatsApp API credentials here
    this.whatsappConfig = {
      apiUrl: process.env.WHATSAPP_API_URL || 'https://api.whatsapp.local', // Replace with actual API
      apiKey: process.env.WHATSAPP_API_KEY || 'your-api-key',
      enabled: process.env.WHATSAPP_ENABLED === 'true' || false
    };

    // Configure your SMS API credentials here
    this.smsConfig = {
      apiUrl: process.env.SMS_API_URL || 'https://api.sms.local', // Replace with actual API
      apiKey: process.env.SMS_API_KEY || 'your-api-key',
      senderId: process.env.SMS_SENDER_ID || 'SOMANING',
      enabled: process.env.SMS_ENABLED === 'true' || false
    };
  }

  // Send WhatsApp message
  async sendWhatsApp(phoneNumber, message, customerName = '') {
    try {
      if (!this.whatsappConfig.enabled) {
        console.log('📱 WhatsApp disabled - Would send to', phoneNumber, ':', message);
        return { success: true, method: 'whatsapp', simulated: true };
      }

      // Clean phone number (remove +91, spaces, etc.)
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);
      
      const whatsappMessage = {
        to: cleanPhone,
        type: 'text',
        text: {
          body: message
        }
      };

      console.log('📱 Sending WhatsApp message to:', cleanPhone);
      console.log('📝 Message:', message);

      // Uncomment and configure for actual WhatsApp API
      /*
      const response = await axios.post(this.whatsappConfig.apiUrl + '/messages', whatsappMessage, {
        headers: {
          'Authorization': `Bearer ${this.whatsappConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        console.log('✅ WhatsApp message sent successfully');
        return { success: true, method: 'whatsapp', messageId: response.data.messageId };
      }
      */

      // For now, simulate successful sending
      console.log('✅ WhatsApp message simulated successfully');
      return { success: true, method: 'whatsapp', simulated: true };

    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error.message);
      return { success: false, method: 'whatsapp', error: error.message };
    }
  }

  // Send SMS message
  async sendSMS(phoneNumber, message, customerName = '') {
    try {
      if (!this.smsConfig.enabled) {
        console.log('📲 SMS disabled - Would send to', phoneNumber, ':', message);
        return { success: true, method: 'sms', simulated: true };
      }

      // Clean phone number
      const cleanPhone = this.cleanPhoneNumber(phoneNumber);

      const smsData = {
        to: cleanPhone,
        message: message,
        sender: this.smsConfig.senderId
      };

      console.log('📲 Sending SMS to:', cleanPhone);
      console.log('📝 Message:', message);

      // Uncomment and configure for actual SMS API
      /*
      const response = await axios.post(this.smsConfig.apiUrl + '/send', smsData, {
        headers: {
          'Authorization': `Bearer ${this.smsConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        console.log('✅ SMS sent successfully');
        return { success: true, method: 'sms', messageId: response.data.messageId };
      }
      */

      // For now, simulate successful sending
      console.log('✅ SMS simulated successfully');
      return { success: true, method: 'sms', simulated: true };

    } catch (error) {
      console.error('❌ Error sending SMS:', error.message);
      return { success: false, method: 'sms', error: error.message };
    }
  }

  // Send reminder notification via multiple channels
  async sendPaymentReminder(reminder) {
    const results = [];
    
    try {
      // Format the reminder message
      const message = this.formatPaymentReminderMessage(reminder);
      
      if (reminder.customerPhone) {
        // Send WhatsApp
        if (reminder.reminderMethod && reminder.reminderMethod.includes('WhatsApp')) {
          const whatsappResult = await this.sendWhatsApp(
            reminder.customerPhone, 
            message, 
            reminder.customerName
          );
          results.push(whatsappResult);
        }

        // Send SMS
        if (reminder.reminderMethod && reminder.reminderMethod.includes('SMS')) {
          const smsResult = await this.sendSMS(
            reminder.customerPhone, 
            message, 
            reminder.customerName
          );
          results.push(smsResult);
        }
      }

      console.log('📤 Payment reminder sent via multiple channels');
      return results;

    } catch (error) {
      console.error('❌ Error sending payment reminder:', error);
      return [{ success: false, error: error.message }];
    }
  }

  // Format payment reminder message
  formatPaymentReminderMessage(reminder) {
    const dueDate = new Date(reminder.dueDate).toLocaleDateString('en-IN');
    const amount = reminder.amount ? `₹${reminder.amount.toLocaleString('en-IN')}` : '';
    
    let message = `🏠 *SOMANING PROPERTY REMINDER*\n\n`;
    message += `Dear ${reminder.customerName},\n\n`;
    message += `📅 Payment Due: ${dueDate}\n`;
    
    if (reminder.plotNumber) {
      message += `🏗️ Plot: ${reminder.plotNumber}\n`;
    }
    
    if (amount) {
      message += `💰 Amount: ${amount}\n`;
    }
    
    message += `\n⚠️ *${reminder.description}*\n\n`;
    message += `Please make the payment on time to avoid any inconvenience.\n\n`;
    message += `📞 For queries, contact us.\n`;
    message += `\n*SOMANING KOLI PROPERTY*`;
    
    return message;
  }

  // Clean and format phone number
  cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    } else if (cleaned.startsWith('91') && cleaned.length === 12) {
      // Already has country code
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      // Remove leading 0 and add country code
      cleaned = '91' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  // Test notification service
  async testNotification(phoneNumber, customerName = 'Test Customer') {
    const testMessage = `🧪 *TEST MESSAGE*\n\nHello ${customerName},\n\nThis is a test notification from SOMANING Property Management System.\n\nIf you received this, the notification service is working correctly!\n\n*SOMANING KOLI PROPERTY*`;
    
    console.log('🧪 Testing notification service...');
    
    const results = [];
    
    // Test WhatsApp
    const whatsappResult = await this.sendWhatsApp(phoneNumber, testMessage, customerName);
    results.push(whatsappResult);
    
    // Test SMS
    const smsResult = await this.sendSMS(phoneNumber, testMessage, customerName);
    results.push(smsResult);
    
    return results;
  }

  // Get service configuration
  getConfig() {
    return {
      whatsapp: {
        enabled: this.whatsappConfig.enabled,
        configured: !!this.whatsappConfig.apiKey
      },
      sms: {
        enabled: this.smsConfig.enabled,
        configured: !!this.smsConfig.apiKey,
        senderId: this.smsConfig.senderId
      }
    };
  }
}

// Export singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;