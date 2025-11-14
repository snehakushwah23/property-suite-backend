const express = require('express');
const Agent = require('../models/Agent');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all agents
router.get('/', auth, async (req, res) => {
  try {
    const agents = await Agent.find({ isActive: true }).sort({ name: 1 });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new agent
router.post('/', auth, authorize(['Admin']), async (req, res) => {
  try {
    const agent = new Agent(req.body);
    await agent.save();
    res.status(201).json({
      message: 'Agent created successfully',
      agent
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Phone number already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update agent
router.put('/:id', auth, authorize(['Admin']), async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({
      message: 'Agent updated successfully',
      agent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete agent
router.delete('/:id', auth, authorize(['Admin']), async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json({ message: 'Agent deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;