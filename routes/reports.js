const express = require('express');
const Plot = require('../models/Plot');
const Agent = require('../models/Agent');
const GSTBill = require('../models/GSTBill');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Sales report
router.get('/sales', auth, async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    const plots = await Plot.find(filter)
      .populate('agentId', 'name phone')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 });
    
    const summary = await Plot.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPlots: { $sum: 1 },
          totalPurchase: { $sum: '$purchasePrice' },
          totalSale: { $sum: '$salePrice' },
          totalProfit: { $sum: '$profitLoss' }
        }
      }
    ]);
    
    res.json({
      plots,
      summary: summary[0] || {
        totalPlots: 0,
        totalPurchase: 0,
        totalSale: 0,
        totalProfit: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent commission report
router.get('/agent-commission', auth, async (req, res) => {
  try {
    const agents = await Agent.aggregate([
      {
        $lookup: {
          from: 'plots',
          localField: '_id',
          foreignField: 'agentId',
          as: 'plots'
        }
      },
      {
        $addFields: {
          totalSales: {
            $size: {
              $filter: {
                input: '$plots',
                cond: { $eq: ['$$this.status', 'Sold'] }
              }
            }
          },
          totalCommission: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$plots',
                    cond: { $eq: ['$$this.status', 'Sold'] }
                  }
                },
                in: {
                  $multiply: ['$$this.salePrice', { $divide: ['$commissionRate', 100] }]
                }
              }
            }
          }
        }
      },
      { $match: { isActive: true } },
      { $sort: { totalCommission: -1 } }
    ]);
    
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Profit/Loss report
router.get('/profit-loss', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = { status: 'Sold' };
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const profitLossData = await Plot.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalProfit: { $sum: '$profitLoss' },
          totalSales: { $sum: 1 },
          avgProfit: { $avg: '$profitLoss' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json(profitLossData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;