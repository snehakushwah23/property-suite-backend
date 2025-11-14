const express = require('express');
const GSTBill = require('../models/GSTBill');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all GST bills
router.get('/', auth, async (req, res) => {
  try {
    const bills = await GSTBill.find()
      .populate('plotId', 'plotNumber')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new GST bill
router.post('/', auth, async (req, res) => {
  try {
    const billData = { ...req.body, createdBy: req.user._id };
    const bill = new GSTBill(billData);
    await bill.save();
    
    res.status(201).json({
      message: 'GST bill created successfully',
      bill
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Bill number already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update GST bill
router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await GSTBill.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!bill) {
      return res.status(404).json({ error: 'GST bill not found' });
    }
    
    res.json({
      message: 'GST bill updated successfully',
      bill
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;