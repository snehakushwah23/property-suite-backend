const express = require('express');
const router = express.Router();
const { DevelopmentExpense, DevelopmentIncome, DevelopmentSite } = require('../models/Development');

// Development Sites CRUD Operations

// GET all development sites
router.get('/sites', async (req, res) => {
  try {
    const sites = await DevelopmentSite.find().sort({ createdAt: -1 });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single development site
router.get('/sites/:siteId', async (req, res) => {
  try {
    const site = await DevelopmentSite.findOne({ siteId: req.params.siteId });
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }
    res.json(site);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new development site
router.post('/sites', async (req, res) => {
  try {
    const site = new DevelopmentSite(req.body);
    const savedSite = await site.save();
    res.status(201).json(savedSite);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Site ID already exists' });
    } else {
      res.status(400).json({ message: error.message });
    }
  }
});

// PUT update development site
router.put('/sites/:siteId', async (req, res) => {
  try {
    const site = await DevelopmentSite.findOneAndUpdate(
      { siteId: req.params.siteId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }
    res.json(site);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE development site
router.delete('/sites/:siteId', async (req, res) => {
  try {
    const site = await DevelopmentSite.findOneAndDelete({ siteId: req.params.siteId });
    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }
    
    // Also delete associated expenses and income
    await DevelopmentExpense.deleteMany({ siteId: req.params.siteId });
    await DevelopmentIncome.deleteMany({ siteId: req.params.siteId });
    
    res.json({ message: 'Site deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Development Expenses CRUD Operations

// GET expenses with filtering and pagination
router.get('/expenses', async (req, res) => {
  try {
    const { 
      siteId, 
      expenseType, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;

    const filter = {};
    if (siteId) filter.siteId = siteId;
    if (expenseType) filter.expenseType = expenseType;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const expenses = await DevelopmentExpense.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DevelopmentExpense.countDocuments(filter);

    res.json({
      expenses,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalExpenses: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single expense
router.get('/expenses/:id', async (req, res) => {
  try {
    const expense = await DevelopmentExpense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new expense
router.post('/expenses', async (req, res) => {
  try {
    const expense = new DevelopmentExpense(req.body);
    const savedExpense = await expense.save();
    res.status(201).json(savedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update expense
router.put('/expenses/:id', async (req, res) => {
  try {
    const expense = await DevelopmentExpense.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE expense
router.delete('/expenses/:id', async (req, res) => {
  try {
    const expense = await DevelopmentExpense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Development Income CRUD Operations

// GET income with filtering
router.get('/income', async (req, res) => {
  try {
    const { 
      siteId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 50 
    } = req.query;

    const filter = {};
    if (siteId) filter.siteId = siteId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const income = await DevelopmentIncome.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DevelopmentIncome.countDocuments(filter);

    res.json({
      income,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalIncome: total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new income
router.post('/income', async (req, res) => {
  try {
    const income = new DevelopmentIncome(req.body);
    const savedIncome = await income.save();
    res.status(201).json(savedIncome);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT update income
router.put('/income/:id', async (req, res) => {
  try {
    const income = await DevelopmentIncome.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.json(income);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE income
router.delete('/income/:id', async (req, res) => {
  try {
    const income = await DevelopmentIncome.findByIdAndDelete(req.params.id);
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Analytics and Reports

// GET site analytics - profit/loss for all sites
router.get('/analytics/sites', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    // Get all sites
    const sites = await DevelopmentSite.find();

    const siteAnalytics = await Promise.all(sites.map(async (site) => {
      const filter = { siteId: site.siteId };
      if (Object.keys(dateFilter).length > 0) {
        filter.date = dateFilter;
      }

      // Get total expenses by type
      const expenses = await DevelopmentExpense.find(filter);
      const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      const expensesByType = {
        jcb: expenses.filter(e => e.expenseType === 'jcb').reduce((sum, e) => sum + e.amount, 0),
        diesel: expenses.filter(e => e.expenseType === 'diesel').reduce((sum, e) => sum + e.amount, 0),
        labor: expenses.filter(e => e.expenseType === 'labor').reduce((sum, e) => sum + e.amount, 0),
        material: expenses.filter(e => e.expenseType === 'material').reduce((sum, e) => sum + e.amount, 0)
      };

      // Get total income
      const income = await DevelopmentIncome.find(filter);
      const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);

      const profit = totalIncome - totalExpense;
      
      return {
        ...site.toObject(),
        totalIncome,
        totalExpense,
        profit,
        status: profit >= 0 ? 'profit' : 'loss',
        workTypes: expensesByType,
        profitMargin: totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(2) : 0,
        lastUpdated: new Date()
      };
    }));

    res.json(siteAnalytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET work type analytics
router.get('/analytics/work-types', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const workTypeAnalytics = await DevelopmentExpense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$expenseType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          sites: { $addToSet: '$siteId' }
        }
      },
      {
        $project: {
          expenseType: '$_id',
          totalAmount: 1,
          count: 1,
          avgAmount: { $round: ['$avgAmount', 2] },
          siteCount: { $size: '$sites' },
          _id: 0
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(workTypeAnalytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET monthly expense trends
router.get('/analytics/trends', async (req, res) => {
  try {
    const { siteId, expenseType } = req.query;
    
    const filter = {};
    if (siteId) filter.siteId = siteId;
    if (expenseType) filter.expenseType = expenseType;

    const trends = await DevelopmentExpense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            expenseType: '$expenseType'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.expenseType': 1
        }
      }
    ]);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;