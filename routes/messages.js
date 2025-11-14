const express = require('express');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all messages
router.get('/', auth, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new message
router.post('/', auth, async (req, res) => {
  try {
    const messageData = { ...req.body, createdBy: req.user._id };
    const message = new Message(messageData);
    await message.save();
    
    res.status(201).json({
      message: 'Message created successfully',
      messageData: message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/:id/send', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Here you would integrate with SMS/WhatsApp/Email services
    // For now, just mark as sent
    message.status = 'sent';
    message.sentDate = new Date();
    message.sentCount = message.recipients.length;
    
    await message.save();
    
    res.json({
      message: 'Message sent successfully',
      sentCount: message.sentCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;