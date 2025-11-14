const mongoose = require('mongoose');
const Reminder = require('../models/Reminder');
const Payment = require('../models/Payment');

// Sample dummy data for testing Auto Reminder System
const createDummyReminders = async () => {
  try {
    console.log('🎭 Creating dummy reminders for testing...');

    // Clear existing test reminders (optional)
    await Reminder.deleteMany({ 
      customerName: { $regex: /Test|Demo|Sample/i }
    });

    const today = new Date();
    
    // Sample reminder data
    const dummyReminders = [
      // Due tomorrow (should trigger)
      {
        transactionId: 'TXN-TEST-001',
        transactionType: 'Advance In',
        title: 'Advance Payment Reminder - Plot P-101',
        description: 'Advance payment of ₹50,000 is due tomorrow for Plot P-101',
        customerName: 'Rahul Test Patil',
        customerPhone: '9876543210',
        customerEmail: 'rahul.test@example.com',
        amount: 50000,
        currency: 'INR',
        transactionDate: new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000), // 28 days ago
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        reminderDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday (past due for reminder)
        reminderTime: '10:00',
        type: 'advance_in',
        status: 'Pending',
        category: 'इसारत दिलेले',
        autoReminder: true,
        reminderMethod: 'WhatsApp,SMS',
        plotId: null,
        notes: 'Dummy reminder for testing auto system',
        tags: ['test', 'dummy', 'advance']
      },
      
      // Due day after tomorrow (should trigger)
      {
        transactionId: 'TXN-TEST-002',
        transactionType: 'Advance Out',
        title: 'Advance Return Reminder - Plot P-205',
        description: 'Advance return of ₹75,000 is due day after tomorrow',
        customerName: 'Priya Demo Sharma',
        customerPhone: '8765432109',
        customerEmail: 'priya.demo@example.com',
        amount: 75000,
        currency: 'INR',
        transactionDate: new Date(today.getTime() - 27 * 24 * 60 * 60 * 1000), // 27 days ago
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        reminderDate: new Date(today.getTime()), // Today (should trigger)
        reminderTime: '11:30',
        type: 'advance_out',
        status: 'Pending',
        category: 'इसारत घेतलेले',
        autoReminder: true,
        reminderMethod: 'WhatsApp',
        plotId: null,
        notes: 'Demo reminder for advance return',
        tags: ['test', 'dummy', 'advance-out']
      },
      
      // Already sent (should not trigger)
      {
        transactionId: 'TXN-TEST-003',
        transactionType: 'Payment Due',
        title: 'Payment Reminder - Plot P-150',
        description: 'Monthly payment of ₹25,000 is overdue',
        customerName: 'Amit Sample Kumar',
        customerPhone: '7654321098',
        customerEmail: 'amit.sample@example.com',
        amount: 25000,
        currency: 'INR',
        transactionDate: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (overdue)
        reminderDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        reminderTime: '09:00',
        type: 'payment',
        status: 'Reminded', 
        category: 'Follow Up',
        autoReminder: true,
        reminderSent: true,
        reminderSentDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        reminderMethod: 'SMS',
        plotId: null,
        sentAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        notificationResults: [
          {
            method: 'sms',
            success: true,
            messageId: 'SMS-TEST-123',
            sentAt: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            simulated: true
          }
        ],
        notes: 'Already sent reminder - testing completed status',
        tags: ['test', 'dummy', 'sent']
      },
      
      // Future reminder (should not trigger yet)
      {
        transactionId: 'TXN-TEST-004',
        transactionType: 'Advance In',
        title: 'Future Advance Payment Reminder - Plot P-300',
        description: 'Advance payment of ₹1,00,000 will be due in 10 days',
        customerName: 'Sneha Future Joshi',
        customerPhone: '6543210987',
        customerEmail: 'sneha.future@example.com',
        amount: 100000,
        currency: 'INR',
        transactionDate: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        reminderDate: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
        reminderTime: '14:00',
        type: 'advance_in',
        status: 'Pending',
        category: 'इसारत दिलेले',
        autoReminder: true,
        reminderMethod: 'WhatsApp,SMS',
        plotId: null,
        notes: 'Future reminder - should not trigger yet',
        tags: ['test', 'dummy', 'future']
      },
      
      // Multiple failed attempts
      {
        transactionId: 'TXN-TEST-005',
        transactionType: 'Follow Up',
        title: 'Follow Up Reminder - Plot P-089',
        description: 'Customer follow up required for plot inquiry',
        customerName: 'Vikram Failed Test',
        customerPhone: '5432109876',
        customerEmail: 'vikram.failed@example.com',
        amount: 0,
        currency: 'INR',
        transactionDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        dueDate: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        reminderDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        reminderTime: '16:30',
        type: 'follow_up',
        status: 'Pending',
        category: 'Follow Up',
        autoReminder: true,
        reminderMethod: 'WhatsApp,SMS',
        plotId: null,
        sentAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
        notificationResults: [
          {
            method: 'whatsapp',
            success: false,
            error: 'API timeout',
            sentAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
            simulated: true
          },
          {
            method: 'sms',
            success: false,
            error: 'Invalid number',
            sentAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
            simulated: true
          }
        ],
        notes: 'Failed notification attempts - needs retry',
        tags: ['test', 'dummy', 'failed']
      }
    ];

    // Insert dummy reminders
    const createdReminders = await Reminder.insertMany(dummyReminders);
    
    console.log(`✅ Created ${createdReminders.length} dummy reminders`);
    console.log('📊 Dummy Data Summary:');
    console.log('   - 2 reminders ready to send (due soon)');
    console.log('   - 1 reminder already sent (completed)');
    console.log('   - 1 future reminder (not due yet)');
    console.log('   - 1 failed reminder (for error testing)');
    
    // Log reminder details
    createdReminders.forEach(reminder => {
      console.log(`   📝 ${reminder.title} - Status: ${reminder.status}`);
    });

    return createdReminders;

  } catch (error) {
    console.error('❌ Error creating dummy reminders:', error);
    throw error;
  }
};

// Function to clean up dummy data
const cleanupDummyReminders = async () => {
  try {
    const result = await Reminder.deleteMany({ 
      customerName: { $regex: /Test|Demo|Sample|Future|Failed/i }
    });
    console.log(`🧹 Cleaned up ${result.deletedCount} dummy reminders`);
    return result;
  } catch (error) {
    console.error('❌ Error cleaning dummy data:', error);
    throw error;
  }
};

module.exports = {
  createDummyReminders,
  cleanupDummyReminders
};