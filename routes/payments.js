const express = require('express');
const Payment = require('../models/Payment');
const Plot = require('../models/Plot');
// const { auth } = require('../middleware/auth'); // Commented for no-auth server

const router = express.Router();

// Get all payments with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      paymentType, 
      plotId, 
      startDate, 
      endDate,
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (paymentType && paymentType !== 'all') filter.paymentType = paymentType;
    if (plotId) filter.plotId = plotId;
    
    // Date range filter
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Search filter
    if (search) {
      filter.$or = [
        { plotNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { receiptNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const payments = await Payment.find(filter)
      .populate('plotId', 'plotNumber buyerName sellerName village area')
      .populate('createdBy', 'name username')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      payments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        hasNext: skip + payments.length < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payments',
      error: error.message 
    });
  }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('plotId', 'plotNumber buyerName sellerName village area location')
      .populate('createdBy', 'name username');
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment',
      error: error.message 
    });
  }
});

// Create new payment
router.post('/', async (req, res) => {
  try {
    const {
      plotId,
      plotNumber,
      paymentType,
      amount,
      date,
      dueDate,
      paymentMode,
      status = 'Pending',
      description,
      customerName,
      customerPhone
    } = req.body;

    // Validate plot exists
    const plot = await Plot.findById(plotId);
    if (!plot) {
      return res.status(404).json({ 
        success: false, 
        message: 'Plot not found' 
      });
    }

    const paymentData = {
      plotId,
      plotNumber: plotNumber || plot.plotNumber,
      paymentType,
      amount: parseFloat(amount),
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentMode,
      status,
      description,
      customerName: customerName || plot.buyerName,
      customerPhone,
      createdBy: req.user?._id || null // Make optional for no-auth
    };

    const payment = new Payment(paymentData);
    await payment.save();
    
    // Populate the saved payment
    await payment.populate('plotId', 'plotNumber buyerName sellerName village area');
    await payment.populate('createdBy', 'name username');
    
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    if (error.code === 11000) {
      res.status(400).json({ 
        success: false, 
        message: 'Receipt number already exists' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Error creating payment',
        error: error.message 
      });
    }
  }
});

// Update payment
router.put('/:id', async (req, res) => {
  try {
    const {
      paymentType,
      amount,
      date,
      dueDate,
      paymentMode,
      status,
      description,
      customerName,
      customerPhone
    } = req.body;

    const updateData = {
      paymentType,
      amount: parseFloat(amount),
      date: new Date(date),
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentMode,
      status,
      description,
      customerName,
      customerPhone
    };

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('plotId', 'plotNumber buyerName sellerName village area')
    .populate('createdBy', 'name username');

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      payment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating payment',
      error: error.message 
    });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting payment',
      error: error.message 
    });
  }
});

// Get payments by plot ID
router.get('/plot/:plotId', async (req, res) => {
  try {
    const payments = await Payment.find({ plotId: req.params.plotId })
      .populate('createdBy', 'name username')
      .sort({ date: -1 });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Error fetching plot payments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching plot payments',
      error: error.message 
    });
  }
});

// Get payment statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const totalPayments = await Payment.countDocuments();
    const pendingPayments = await Payment.countDocuments({ status: 'Pending' });
    const receivedPayments = await Payment.countDocuments({ status: 'Received' });
    const overduePayments = await Payment.countDocuments({ 
      status: 'Pending', 
      dueDate: { $lt: new Date() } 
    });

    const totalAmount = await Payment.aggregate([
      { $match: { status: 'Received' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingAmount = await Payment.aggregate([
      { $match: { status: 'Pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalPayments,
        pendingPayments,
        receivedPayments,
        overduePayments,
        totalAmount: totalAmount[0]?.total || 0,
        pendingAmount: pendingAmount[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching payment statistics',
      error: error.message 
    });
  }
});

module.exports = router;