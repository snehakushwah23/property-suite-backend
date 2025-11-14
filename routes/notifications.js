const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const reminderService = require('../services/reminderService');
const Reminder = require('../models/Reminder');
const { createDummyReminders, cleanupDummyReminders } = require('../scripts/createDummyReminders');

// Test notification service
router.post('/test', async (req, res) => {
  try {
    const { phoneNumber, customerName } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log('🧪 Testing notification service...');
    const results = await notificationService.testNotification(phoneNumber, customerName || 'Test Customer');

    res.json({
      success: true,
      message: 'Test notifications sent',
      results: results,
      config: notificationService.getConfig()
    });

  } catch (error) {
    console.error('❌ Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test notification',
      error: error.message
    });
  }
});

// Send manual reminder
router.post('/send-reminder/:reminderId', async (req, res) => {
  try {
    const { reminderId } = req.params;

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    console.log(`📤 Manually sending reminder: ${reminder.title}`);
    const results = await notificationService.sendPaymentReminder(reminder);

    // Update reminder with results
    const hasSuccessfulNotification = results.some(result => result.success);
    
    if (hasSuccessfulNotification) {
      reminder.status = 'Reminded';
      reminder.reminderSent = true;
      reminder.reminderSentDate = new Date();
      reminder.sentAt = new Date();
      reminder.notificationResults = results;
      await reminder.save();
    } else {
      reminder.notificationResults = results;
      await reminder.save();
    }

    res.json({
      success: hasSuccessfulNotification,
      message: hasSuccessfulNotification ? 'Reminder sent successfully' : 'Failed to send reminder',
      results: results,
      reminder: {
        id: reminder._id,
        title: reminder.title,
        customerName: reminder.customerName,
        status: reminder.status
      }
    });

  } catch (error) {
    console.error('❌ Manual reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reminder',
      error: error.message
    });
  }
});

// Check due reminders manually
router.post('/check-due', async (req, res) => {
  try {
    console.log('🔍 Manually checking due reminders...');
    
    await reminderService.checkReminders();
    
    res.json({
      success: true,
      message: 'Due reminders check completed'
    });

  } catch (error) {
    console.error('❌ Check reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking reminders',
      error: error.message
    });
  }
});

// Get notification service status and config
router.get('/config', (req, res) => {
  try {
    const config = notificationService.getConfig();
    const serviceStatus = {
      reminderService: reminderService.isRunning ? 'running' : 'stopped'
    };

    res.json({
      success: true,
      config: config,
      serviceStatus: serviceStatus
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting configuration',
      error: error.message
    });
  }
});

// Get recent notification history
router.get('/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const reminders = await Reminder.find({
      notificationResults: { $exists: true, $ne: [] }
    })
    .sort({ sentAt: -1 })
    .limit(parseInt(limit))
    .select('title customerName customerPhone sentAt notificationResults status');

    res.json({
      success: true,
      reminders: reminders
    });

  } catch (error) {
    console.error('❌ History error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification history',
      error: error.message
    });
  }
});

// Create dummy reminders for testing
router.post('/create-dummy-data', async (req, res) => {
  try {
    console.log('🎭 Creating dummy reminder data for testing...');
    
    const dummyReminders = await createDummyReminders();
    
    res.json({
      success: true,
      message: 'Dummy reminder data created successfully',
      count: dummyReminders.length,
      reminders: dummyReminders.map(r => ({
        id: r._id,
        title: r.title,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        dueDate: r.dueDate,
        reminderDate: r.reminderDate,
        status: r.status,
        amount: r.amount,
        type: r.transactionType
      }))
    });

  } catch (error) {
    console.error('❌ Error creating dummy data:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating dummy reminder data',
      error: error.message
    });
  }
});

// Clean up dummy reminders
router.delete('/cleanup-dummy-data', async (req, res) => {
  try {
    console.log('🧹 Cleaning up dummy reminder data...');
    
    const result = await cleanupDummyReminders();
    
    res.json({
      success: true,
      message: `Successfully cleaned up ${result.deletedCount} dummy reminders`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error cleaning dummy data:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning dummy reminder data',
      error: error.message
    });
  }
});

// Get all reminders with filtering
router.get('/reminders', async (req, res) => {
  try {
    const { 
      status, 
      type, 
      customerName, 
      dueFrom, 
      dueTo, 
      limit = 20, 
      page = 1 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }
    if (dueFrom || dueTo) {
      filter.dueDate = {};
      if (dueFrom) filter.dueDate.$gte = new Date(dueFrom);
      if (dueTo) filter.dueDate.$lte = new Date(dueTo);
    }

    // Get reminders with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reminders = await Reminder.find(filter)
      .sort({ dueDate: 1, reminderDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('transactionId title customerName customerPhone dueDate reminderDate status amount type category reminderMethod notificationResults');

    const total = await Reminder.countDocuments(filter);

    res.json({
      success: true,
      reminders: reminders,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reminders',
      error: error.message
    });
  }
});

module.exports = router;