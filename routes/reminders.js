const express = require('express');
const Reminder = require('../models/Reminder');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all reminders
router.get('/', auth, async (req, res) => {
  try {
    const reminders = await Reminder.find()
      .populate('plotId', 'plotNumber')
      .populate('agentId', 'name phone')
      .populate('createdBy', 'name username')
      .sort({ reminderDate: 1 });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new reminder
router.post('/', auth, async (req, res) => {
  try {
    const reminderData = { ...req.body, createdBy: req.user._id };
    const reminder = new Reminder(reminderData);
    await reminder.save();
    
    res.status(201).json({
      message: 'Reminder created successfully',
      reminder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update reminder
router.put('/:id', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json({
      message: 'Reminder updated successfully',
      reminder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark reminder as completed
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );
    
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    
    res.json({
      message: 'Reminder marked as completed',
      reminder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;