const express = require('express');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

const router = express.Router();

// ===========================
// EXPENSE ROUTES
// ===========================

// In-memory fallbacks when MongoDB is disconnected
const memoryExpenses = [];
const memoryIncome = [];

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;

// Get all expenses with filtering and pagination
router.get('/expenses', async (req, res) => {
  try {
    console.log('📊 GET /expenses called with query:', req.query);
    
    const { 
      category, 
      site, 
      startDate,  
      endDate, 
      paymentStatus,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const filter = {};
    
    if (category) filter.category = category;
    if (site) filter.site = site;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    console.log('📋 Filter being used:', filter);
    
    if (isDbConnected()) {
      const expenses = await Expense.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      console.log(`✅ Found ${expenses.length} expenses in database`);
      console.log('📝 Expenses:', expenses.map(e => ({ id: e._id, category: e.category, itemName: e.itemName || e.workerName || e.contractorName || 'Unknown' })));
      
      const totalExpenses = await Expense.countDocuments(filter);
      console.log(`📊 Total expense count: ${totalExpenses}`);
      
      return res.json({
        success: true,
        expenses,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: totalExpenses,
          pages: Math.ceil(totalExpenses / limit)
        }
      });
    }

    // Fallback to in-memory when DB disconnected
    console.log('⚠️ MongoDB disconnected - serving expenses from memory');
    let results = memoryExpenses.filter(exp => {
      if (category && exp.category !== category) return false;
      if (site && exp.site !== site) return false;
      if (paymentStatus && exp.paymentStatus !== paymentStatus) return false;
      if (startDate || endDate) {
        const d = new Date(exp.date);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
      }
      return true;
    });

    // Sort by createdAt desc
    results = results.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

    const totalExpenses = results.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const paged = results.slice(start, end);

    return res.json({
      success: true,
      expenses: paged,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total: totalExpenses,
        pages: Math.ceil(totalExpenses / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create new expense
router.post('/expenses', async (req, res) => {
  try {
    console.log('Received expense data:', req.body);
    
    const mongoose = require('mongoose');
    
    // Create expense data without copying createdBy automatically
    const { addedBy, ...otherData } = req.body;
    const expenseData = { ...otherData };
    
    console.log('Category received:', expenseData.category);
    console.log('workDetails field:', expenseData.workDetails);
    console.log('description field:', expenseData.description);
    
    // Handle description field for categories that require it
    if (expenseData.category === 'contractor') {
      // For contractor: use workDetails as description
      if (expenseData.workDetails && expenseData.workDetails.trim() !== '') {
        expenseData.description = expenseData.workDetails;
        console.log('✅ Mapped workDetails to description:', expenseData.description);
      } else {
        expenseData.description = 'Contractor work (no details provided)';
        console.log('⚠️ No workDetails provided, using fallback description');
      }
    } else if (expenseData.category === 'other') {
      // For other: description should already be provided, but add fallback
      if (!expenseData.description || expenseData.description.trim() === '') {
        expenseData.description = expenseData.expenseType || 'Other expense';
        console.log('⚠️ No description provided for other expense, using fallback');
      }
    }
    
    console.log('Final description field:', expenseData.description);
    
    // Ensure billNumber is always provided (required for all categories)
    if (!expenseData.billNumber || expenseData.billNumber.trim() === '') {
      // Generate a default bill number based on category and timestamp
      const timestamp = Date.now();
      const categoryCode = {
        'material': 'MAT',
        'labor': 'LAB', 
        'contractor': 'CON',
        'engineer': 'ENG',
        'other': 'OTH'
      };
      expenseData.billNumber = `${categoryCode[expenseData.category] || 'EXP'}-${timestamp}`;
      console.log('⚠️ No billNumber provided, generated:', expenseData.billNumber);
    }
    
    console.log('Final billNumber field:', expenseData.billNumber);
    
    // Calculate totalAmount for labor category if missing
    if (expenseData.category === 'labor' && expenseData.days && expenseData.dailyWage) {
      if (!expenseData.totalAmount || expenseData.totalAmount === '') {
        expenseData.totalAmount = Number(expenseData.days) * Number(expenseData.dailyWage);
        console.log('Calculated totalAmount for labor:', expenseData.totalAmount);
      }
    }
    
    // Ensure numeric fields are properly converted
    if (expenseData.amount && typeof expenseData.amount === 'string') {
      expenseData.amount = Number(expenseData.amount);
    }
    if (expenseData.totalAmount && typeof expenseData.totalAmount === 'string') {
      expenseData.totalAmount = Number(expenseData.totalAmount);
    }
    
    // Only add createdBy if we have a valid addedBy value
    if (addedBy && mongoose.Types.ObjectId.isValid(addedBy)) {
      expenseData.createdBy = new mongoose.Types.ObjectId(addedBy);
      console.log('Added valid createdBy ObjectId:', expenseData.createdBy.toString());
    } else {
      console.log('No valid addedBy provided, leaving createdBy undefined (optional field)');
    }
    
    console.log('Processing expense data:', { 
      ...expenseData, 
      createdBy: expenseData.createdBy?.toString() || 'undefined' 
    });
    
    if (isDbConnected()) {
      const expense = new Expense(expenseData);
      await expense.save();
      console.log('✅ Expense saved successfully with ID:', expense._id);
      return res.status(201).json({
        success: true,
        message: 'Expense created successfully',
        expense
      });
    }

    // Fallback to memory when DB disconnected
    const memoryExpense = {
      _id: Date.now().toString(),
      ...expenseData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoryExpenses.unshift(memoryExpense);
    console.log('⚠️ MongoDB disconnected - expense saved to memory:', memoryExpense._id);
    return res.status(201).json({
      success: true,
      message: 'Expense created successfully (memory)',
      expense: memoryExpense
    });
  } catch (error) {
    console.error('❌ Error creating expense:', error.message);
    console.error('Error details:', error.errors || error);
    res.status(400).json({ 
      success: false, 
      error: error.message,
      details: error.errors || error,
      hint: 'Check if all required fields are provided based on category'
    });
  }
});

// Update expense
router.put('/expenses/:id', async (req, res) => {
  try {
    if (isDbConnected()) {
      const expense = await Expense.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!expense) {
        return res.status(404).json({ 
          success: false, 
          error: 'Expense not found' 
        });
      }
      
      return res.json({
        success: true,
        message: 'Expense updated successfully',
        expense
      });
    }

    // Fallback to memory
    const idx = memoryExpenses.findIndex(e => e._id == req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    memoryExpenses[idx] = { ...memoryExpenses[idx], ...req.body, updatedAt: new Date().toISOString() };
    return res.json({ success: true, message: 'Expense updated successfully (memory)', expense: memoryExpenses[idx] });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete expense
// Delete expense (NO AUTH REQUIRED)
router.delete('/expenses/:id', async (req, res) => {
  try {
    if (isDbConnected()) {
      const expense = await Expense.findByIdAndDelete(req.params.id);
      if (!expense) {
        return res.status(404).json({ success: false, error: 'Expense not found' });
      }
      return res.json({ success: true, message: 'Expense deleted successfully' });
    }
    // Fallback to memory
    const idx = memoryExpenses.findIndex(e => e._id == req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    memoryExpenses.splice(idx, 1);
    return res.json({ success: true, message: 'Expense deleted successfully (memory)' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get expense statistics
router.get('/expenses/stats', async (req, res) => {
  try {
    const { site, startDate, endDate } = req.query;
    
    const filter = {};
    if (site) filter.site = site;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (isDbConnected()) {
      const stats = await Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            totalAmount: { 
              $sum: { 
                $ifNull: [
                  { $add: ['$amount', '$totalAmount'] }, 
                  { $ifNull: ['$amount', '$totalAmount'] }
                ] 
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            category: '$_id',
            totalAmount: 1,
            count: 1,
            _id: 0
          }
        }
      ]);
      const totalExpenseAmount = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);
      return res.json({ success: true, stats, totalExpenseAmount, totalRecords: stats.reduce((sum, stat) => sum + stat.count, 0) });
    }

    // Fallback stats from memory
    const filtered = memoryExpenses.filter(exp => {
      if (site && exp.site !== site) return false;
      if (startDate || endDate) {
        const d = new Date(exp.date);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
      }
      return true;
    });
    const byCategory = {};
    for (const exp of filtered) {
      const cat = exp.category || 'other';
      const amt = Number(exp.totalAmount || exp.totalSalary || exp.amount || 0);
      if (!byCategory[cat]) byCategory[cat] = { totalAmount: 0, count: 0 };
      byCategory[cat].totalAmount += amt;
      byCategory[cat].count += 1;
    }
    const stats = Object.entries(byCategory).map(([category, v]) => ({ category, totalAmount: v.totalAmount, count: v.count }));
    const totalExpenseAmount = stats.reduce((sum, s) => sum + s.totalAmount, 0);
    return res.json({ success: true, stats, totalExpenseAmount, totalRecords: filtered.length });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===========================
// INCOME ROUTES
// ===========================

// Get all income records with filtering and pagination
router.get('/income', async (req, res) => {
  try {
    const { 
      site, 
      paymentStatus,
      startDate, 
      endDate,
      page = 1, 
      limit = 50 
    } = req.query;
    
    const filter = {};
    
    if (site) filter.site = site;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (isDbConnected()) {
      const income = await Income.find(filter)
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      const totalIncome = await Income.countDocuments(filter);
      res.set('X-Total-Count', String(totalIncome));
      return res.json(income);
    }

    // Fallback
    console.log('⚠️ MongoDB disconnected - serving income from memory');
    let results = memoryIncome.filter(it => {
      if (site && it.site !== site) return false;
      if (paymentStatus && it.paymentStatus !== paymentStatus) return false;
      if (startDate || endDate) {
        const d = new Date(it.date);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
      }
      return true;
    });
    results = results.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    const totalIncome = results.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const paged = results.slice(start, end);
    res.set('X-Total-Count', String(totalIncome));
    return res.json(paged);
  } catch (error) {
    console.error('Error fetching income:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create new income record
router.post('/income', async (req, res) => {
  try {
    console.log('Received income data:', req.body);
    // Build income data without forcing an invalid ObjectId for createdBy.
    // Only include createdBy if a valid ObjectId string is provided.
    const incomeData = { ...req.body };
    if (req.body.createdBy && mongoose.Types.ObjectId.isValid(req.body.createdBy)) {
      incomeData.createdBy = req.body.createdBy;
    } else if (req.body.addedBy && mongoose.Types.ObjectId.isValid(req.body.addedBy)) {
      incomeData.createdBy = req.body.addedBy;
    }
    // If neither is valid, we omit createdBy to avoid Cast errors; Mongoose will accept undefined.
    if (isDbConnected()) {
      const income = new Income(incomeData);
      await income.save();
      console.log('Income saved successfully:', income);
      return res.status(201).json({ success: true, message: 'Income record created successfully', income });
    }

    // Fallback to memory
    const memoryItem = { _id: Date.now().toString(), ...incomeData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    memoryIncome.unshift(memoryItem);
    console.log('⚠️ MongoDB disconnected - income saved to memory:', memoryItem._id);
    return res.status(201).json({ success: true, message: 'Income record created successfully (memory)', income: memoryItem });
  } catch (error) {
    console.error('Error creating income:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message,
      details: error.errors || error
    });
  }
});

// Update income record
router.put('/income/:id', async (req, res) => {
  try {
    if (isDbConnected()) {
      const income = await Income.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!income) {
        return res.status(404).json({ success: false, error: 'Income record not found' });
      }
      return res.json({ success: true, message: 'Income record updated successfully', income });
    }
    // Fallback to memory
    const idx = memoryIncome.findIndex(i => i._id == req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Income record not found' });
    }
    memoryIncome[idx] = { ...memoryIncome[idx], ...req.body, updatedAt: new Date().toISOString() };
    return res.json({ success: true, message: 'Income record updated successfully (memory)', income: memoryIncome[idx] });
  } catch (error) {
    console.error('Error updating income:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete income record
router.delete('/income/:id', async (req, res) => {
  try {
    if (isDbConnected()) {
      const income = await Income.findByIdAndDelete(req.params.id);
      if (!income) {
        return res.status(404).json({ success: false, error: 'Income record not found' });
      }
      return res.json({ success: true, message: 'Income record deleted successfully' });
    }
    // Fallback to memory
    const idx = memoryIncome.findIndex(i => i._id == req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Income record not found' });
    }
    memoryIncome.splice(idx, 1);
    return res.json({ success: true, message: 'Income record deleted successfully (memory)' });
  } catch (error) {
    console.error('Error deleting income:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get income statistics
router.get('/income/stats', async (req, res) => {
  try {
    const { site, startDate, endDate } = req.query;
    
    const filter = {};
    if (site) filter.site = site;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (isDbConnected()) {
      const stats = await Income.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$paymentStatus',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: '$_id',
            totalAmount: 1,
            count: 1,
            _id: 0
          }
        }
      ]);
      const totalIncomeAmount = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);
      return res.json({ success: true, stats, totalIncomeAmount, totalRecords: stats.reduce((sum, stat) => sum + stat.count, 0) });
    }

    // Fallback stats from memory
    const filtered = memoryIncome.filter(it => {
      if (site && it.site !== site) return false;
      if (startDate || endDate) {
        const d = new Date(it.date);
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
      }
      return true;
    });
    const byStatus = {};
    for (const it of filtered) {
      const st = it.paymentStatus || 'Pending';
      const amt = Number(it.amount || 0);
      if (!byStatus[st]) byStatus[st] = { totalAmount: 0, count: 0 };
      byStatus[st].totalAmount += amt;
      byStatus[st].count += 1;
    }
    const stats = Object.entries(byStatus).map(([status, v]) => ({ status, totalAmount: v.totalAmount, count: v.count }));
    const totalIncomeAmount = stats.reduce((sum, s) => sum + s.totalAmount, 0);
    return res.json({ success: true, stats, totalIncomeAmount, totalRecords: filtered.length });
  } catch (error) {
    console.error('Error fetching income stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===========================
// PROFIT/LOSS & ANALYTICS
// ===========================

// Get profit/loss analysis
router.get('/analytics/profit-loss', auth, async (req, res) => {
  try {
    const { site, startDate, endDate } = req.query;
    
    const filter = {};
    if (site) filter.site = site;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    // Get total expenses
    const expenseStats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalExpenses: { 
            $sum: { 
              $ifNull: [
                { $add: ['$amount', '$totalAmount'] }, 
                { $ifNull: ['$amount', '$totalAmount'] }
              ] 
            }
          }
        }
      }
    ]);
    
    // Get total income
    const incomeStats = await Income.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalExpenses = expenseStats[0]?.totalExpenses || 0;
    const totalIncome = incomeStats[0]?.totalIncome || 0;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;
    
    res.json({
      success: true,
      analytics: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        period: { startDate, endDate },
        site: site || 'All Sites'
      }
    });
  } catch (error) {
    console.error('Error fetching profit/loss analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ===========================
// TEMPORARY ROUTES WITHOUT AUTH FOR TESTING
// ===========================

// Test route to check if construction routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Construction routes are working!',
    timestamp: new Date().toISOString()
  });
});

// Create new expense without authentication (for testing)
router.post('/expenses/test', async (req, res) => {
  try {
    const expenseData = {
      ...req.body,
      createdBy: 'test-user' // Default user for testing
    };
    
    const expense = new Expense(expenseData);
    await expense.save();
    
    res.status(201).json({
      success: true,
      message: 'Expense created successfully (test mode)',
      expense
    });
  } catch (error) {
    console.error('Error creating test expense:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get all expenses without authentication (for testing)
router.get('/expenses/test', async (req, res) => {
  try {
    const expenses = await Expense.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.json({
      success: true,
      expenses,
      count: expenses.length
    });
  } catch (error) {
    console.error('Error fetching test expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;