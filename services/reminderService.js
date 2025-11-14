const Reminder = require('../models/Reminder');
const moment = require('moment');
const notificationService = require('./notificationService');
const mongoose = require('mongoose');

class ReminderService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  // Start the auto-reminder service
  start() {
    if (this.isRunning) {
      console.log('⚠️ Reminder service is already running');
      return;
    }

    console.log('🔔 Starting Auto Reminder Service...');
    this.isRunning = true;

    // Run immediately on start (only if DB is connected)
    this.checkReminders();

    // Set up interval to check every 24 hours
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, this.checkInterval);

    console.log('✅ Auto Reminder Service started - checking every 24 hours');
  }

  // Stop the auto-reminder service
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Reminder service is not running');
      return;
    }

    console.log('🔔 Stopping Auto Reminder Service...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('✅ Auto Reminder Service stopped');
  }

  // Check for due reminders
  async checkReminders() {
    try {
      console.log('🔍 Checking for due reminders...');
      
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️ MongoDB not connected, skipping reminder check');
        return;
      }
      
      // Find reminders that are due for sending
      const dueReminders = await Reminder.findDueReminders();
      
      if (dueReminders.length === 0) {
        console.log('📋 No due reminders found');
        return;
      }

      console.log(`📨 Found ${dueReminders.length} due reminders`);

      // Process each due reminder
      for (const reminder of dueReminders) {
        await this.processReminder(reminder);
      }

      // Check for overdue reminders and update their status
      await this.checkOverdueReminders();

    } catch (error) {
      console.error('❌ Error checking reminders:', error);
      
      // If it's a timeout error, log it but don't crash
      if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
        console.log('⚠️ MongoDB connection timeout - will retry on next check');
      }
    }
  }

  // Process a single reminder
  async processReminder(reminder) {
    try {
      console.log(`📤 Processing reminder: ${reminder.title} for ${reminder.customerName}`);
      
      // Send actual notifications via WhatsApp/SMS
      const notificationResults = await notificationService.sendPaymentReminder(reminder);
      
      // Check if at least one notification was successful
      const hasSuccessfulNotification = notificationResults.some(result => result.success);
      
      if (hasSuccessfulNotification) {
        // Mark reminder as sent
        await reminder.markReminderSent();
        
        // Store notification results
        reminder.notificationResults = notificationResults;
        await reminder.save();
        
        console.log(`✅ Reminder sent successfully: ${reminder.title}`);
        console.log(`📊 Notification results:`, notificationResults);
        
        // Log the reminder actions for tracking
        this.logReminderActions(reminder);
        
        return { success: true, reminderId: reminder._id, notificationResults };
      } else {
        // Mark reminder as failed but don't use markReminderSent
        reminder.status = 'failed';
        reminder.sentAt = new Date();
        reminder.notificationResults = notificationResults;
        await reminder.save();
        
        console.log(`❌ All notifications failed for reminder: ${reminder.title}`);
        return { success: false, reminderId: reminder._id, error: 'All notification methods failed' };
      }

    } catch (error) {
      console.error(`❌ Error processing reminder ${reminder.title}:`, error);
      
      // Mark reminder as failed
      try {
        reminder.status = 'failed';
        reminder.sentAt = new Date();
        await reminder.save();
      } catch (saveError) {
        console.error('Error saving failed reminder status:', saveError);
      }
      
      return { success: false, reminderId: reminder._id, error: error.message };
    }
  }

  // Check for overdue reminders and update their status
  async checkOverdueReminders() {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️ MongoDB not connected, skipping overdue check');
        return;
      }
      
      const overdueReminders = await Reminder.findOverdueReminders();
      
      if (overdueReminders.length === 0) {
        return;
      }

      console.log(`⏰ Found ${overdueReminders.length} overdue reminders`);

      // Update status to overdue
      for (const reminder of overdueReminders) {
        reminder.status = 'Overdue';
        await reminder.save();
        console.log(`⏰ Marked as overdue: ${reminder.title}`);
      }

    } catch (error) {
      console.error('❌ Error checking overdue reminders:', error);
    }
  }

  // Log what actions would be taken for a reminder
  logReminderActions(reminder) {
    console.log(`📋 Reminder Details:`);
    console.log(`   Title: ${reminder.title}`);
    console.log(`   Customer: ${reminder.customerName}`);
    console.log(`   Phone: ${reminder.customerPhone}`);
    console.log(`   Category: ${reminder.category}`);
    console.log(`   Amount: ₹${reminder.amount || 0}`);
    console.log(`   Due Date: ${reminder.dueDate.toLocaleDateString('en-IN')}`);
    
    // Log potential actions (in a real implementation, these would actually send notifications)
    console.log(`📱 Actions that could be taken:`);
    
    if (reminder.customerPhone) {
      console.log(`   - WhatsApp message to ${reminder.customerPhone}`);
      console.log(`   - SMS to ${reminder.customerPhone}`);
    }
    
    if (reminder.customerEmail) {
      console.log(`   - Email to ${reminder.customerEmail}`);
    }
    
    console.log(`   - Generate PDF reminder document`);
    console.log(`   - Create system notification`);
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('🔔 Manual reminder check triggered');
    await this.checkReminders();
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextCheck: this.intervalId ? new Date(Date.now() + this.checkInterval) : null
    };
  }

  // Create a test reminder for demonstration
  async createTestReminder() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const testReminder = new Reminder({
        title: 'Test Payment Reminder',
        description: 'This is a test reminder created by the system',
        customerName: 'Test Customer',
        customerPhone: '9999999999',
        customerEmail: 'test@example.com',
        dueDate: tomorrow,
        transactionType: 'Payment Due',
        category: 'Other',
        amount: 50000,
        autoReminder: true
      });

      await testReminder.save();
      console.log('✅ Test reminder created successfully');
      return testReminder;

    } catch (error) {
      console.error('❌ Error creating test reminder:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const reminderService = new ReminderService();

module.exports = reminderService;