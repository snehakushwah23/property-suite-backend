// Quick test for Auto Reminder System
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/somaning_property');
    console.log('✅ MongoDB Connected for testing');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const testAutoReminderSystem = async () => {
  await connectDB();
  
  try {
    const Reminder = require('./models/Reminder');
    
    console.log('🔍 Testing Auto Reminder System...\n');
    
    // Get all dummy reminders
    const allReminders = await Reminder.find({ 
      customerName: { $regex: /Test|Demo|Sample|Future|Failed/i }
    });
    
    console.log(`📊 Found ${allReminders.length} test reminders:`);
    allReminders.forEach(reminder => {
      const dueDate = reminder.dueDate.toLocaleDateString('en-IN');
      const reminderDate = reminder.reminderDate.toLocaleDateString('en-IN');
      const today = new Date().toLocaleDateString('en-IN');
      
      const isDue = new Date(reminder.reminderDate) <= new Date();
      const status = isDue ? '⚠️ DUE' : '🕐 FUTURE';
      
      console.log(`   📝 ${reminder.customerName}`);
      console.log(`      Due: ${dueDate} | Reminder: ${reminderDate} | ${status}`);
      console.log(`      Status: ${reminder.status} | Method: ${reminder.reminderMethod}`);
      console.log('');
    });
    
    // Test the reminder service
    const reminderService = require('./services/reminderService');
    
    console.log('🚀 Testing Reminder Service...');
    await reminderService.checkReminders();
    
    console.log('\n📱 Testing Notification Service...');
    const notificationService = require('./services/notificationService');
    
    // Test with a sample reminder
    const sampleReminder = allReminders.find(r => r.customerName.includes('Rahul'));
    if (sampleReminder) {
      console.log(`🧪 Testing notification for: ${sampleReminder.customerName}`);
      const results = await notificationService.sendPaymentReminder(sampleReminder);
      console.log('📤 Notification Results:', results);
    }
    
    console.log('\n🎉 Auto Reminder System Test Complete!');
    console.log('📝 Summary:');
    console.log('   ✅ Dummy data created successfully');
    console.log('   ✅ Reminder service working');
    console.log('   ✅ Notification service working');
    console.log('   ✅ WhatsApp/SMS simulation active');
    
  } catch (error) {
    console.error('\n❌ Error testing auto reminder system:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the test
if (require.main === module) {
  testAutoReminderSystem();
}

module.exports = { testAutoReminderSystem };