// Quick script to create dummy reminders
// Run this in your Node.js terminal in the backend directory

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/somaning_property');
    console.log('✅ MongoDB Connected for dummy data creation');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createQuickDummyData = async () => {
  await connectDB();
  
  const { createDummyReminders } = require('./scripts/createDummyReminders');
  
  console.log('🎭 Creating dummy reminder data...\n');
  
  try {
    const dummyReminders = await createDummyReminders();
    
    console.log('\n🎉 SUCCESS! Dummy data created:');
    console.log('📊 Summary:');
    dummyReminders.forEach(reminder => {
      const dueDate = reminder.dueDate.toLocaleDateString('en-IN');
      const status = reminder.status;
      console.log(`   📝 ${reminder.customerName} - Due: ${dueDate} - Status: ${status}`);
    });
    
    console.log('\n🔧 Next steps:');
    console.log('   1. Start your backend server: npm start');
    console.log('   2. Open NotificationTester component in frontend');
    console.log('   3. Click "Check Due Reminders" to test the system');
    console.log('   4. Check server console for notification logs');
    
    console.log('\n📱 API endpoints available:');
    console.log('   POST /api/notifications/check-due - Check due reminders');
    console.log('   GET  /api/notifications/reminders - View all reminders');
    console.log('   POST /api/notifications/test - Test notifications');
    
  } catch (error) {
    console.error('\n❌ Error creating dummy data:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  createQuickDummyData();
}

module.exports = { createQuickDummyData };