const express = require('express');
const Plot = require('../models/Plot');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Reminder = require('../models/Reminder');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const [
      totalPlots,
      soldPlots,
      availablePlots,
      reservedPlots,
      totalAgents,
      pendingReminders,
      revenueData,
      recentPlots,
      topAgents,
      monthlyStats
    ] = await Promise.all([
      Plot.countDocuments(),
      Plot.countDocuments({ status: 'Sold' }),
      Plot.countDocuments({ status: 'Available' }),
      Plot.countDocuments({ status: 'Reserved' }),
      Agent.countDocuments({ isActive: true }),
      Reminder.countDocuments({ 
        reminderDate: { $lte: new Date() }, 
        status: 'pending' 
      }),
      Plot.aggregate([
        { $match: { status: 'Sold' } },
        { $group: { _id: null, total: { $sum: '$salePrice' } } }
      ]),
      Plot.find()
        .populate('agentId', 'name phone')
        .populate('createdBy', 'name username')
        .sort({ createdAt: -1 })
        .limit(5),
      Agent.aggregate([
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
            totalAmount: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$plots',
                      cond: { $eq: ['$$this.status', 'Sold'] }
                    }
                  },
                  in: '$$this.salePrice'
                }
              }
            }
          }
        },
        { $match: { isActive: true } },
        { $sort: { totalAmount: -1 } },
        { $limit: 5 },
        { $project: { name: 1, phone: 1, totalSales: 1, totalAmount: 1 } }
      ]),
      Plot.aggregate([
        { $match: { status: 'Sold', createdAt: { $gte: new Date(Date.now() - 365*24*60*60*1000) } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 },
            revenue: { $sum: '$salePrice' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            month: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                { $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]}
              ]
            },
            count: 1,
            revenue: 1,
            _id: 0
          }
        }
      ])
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    const salesRate = totalPlots > 0 ? ((soldPlots / totalPlots) * 100).toFixed(1) : 0;

    res.json({
      overview: {
        totalPlots,
        soldPlots,
        availablePlots,
        reservedPlots,
        totalRevenue,
        totalAgents,
        pendingReminders,
        salesRate
      },
      recentActivity: recentPlots,
      topPerformers: topAgents,
      monthlyTrends: monthlyStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get revenue analytics
router.get('/revenue', auth, (req, res) => {
  const { period = 'year', startDate, endDate } = req.query;
  
  let dateFilter = '';
  let groupBy = '';
  
  if (startDate && endDate) {
    dateFilter = `AND created_at BETWEEN '${startDate}' AND '${endDate}'`;
  }
  
  switch (period) {
    case 'month':
      groupBy = "strftime('%Y-%m-%d', created_at)";
      dateFilter = dateFilter || "AND created_at >= date('now', '-30 days')";
      break;
    case 'quarter':
      groupBy = "strftime('%Y-Q' || ((strftime('%m', created_at) - 1) / 3 + 1), created_at)";
      dateFilter = dateFilter || "AND created_at >= date('now', '-3 months')";
      break;
    case 'year':
    default:
      groupBy = "strftime('%Y-%m', created_at)";
      dateFilter = dateFilter || "AND created_at >= date('now', '-12 months')";
      break;
  }
  
  const query = `
    SELECT 
      ${groupBy} as period,
      COUNT(*) as sales_count,
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as avg_sale_amount,
      MIN(total_amount) as min_sale,
      MAX(total_amount) as max_sale
    FROM plots 
    WHERE status = 'Sold' ${dateFilter}
    GROUP BY period
    ORDER BY period
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get agent performance
router.get('/agents', auth, (req, res) => {
  const query = `
    SELECT 
      a.id,
      a.name,
      a.mobile,
      a.commission_rate,
      COUNT(p.id) as total_plots,
      COUNT(CASE WHEN p.status = 'Sold' THEN 1 END) as sold_plots,
      COALESCE(SUM(CASE WHEN p.status = 'Sold' THEN p.total_amount END), 0) as total_sales,
      COALESCE(SUM(CASE WHEN p.status = 'Sold' THEN (p.total_amount * a.commission_rate / 100) END), 0) as total_commission
    FROM agents a
    LEFT JOIN plots p ON a.id = p.agent_id
    WHERE a.is_active = 1
    GROUP BY a.id, a.name, a.mobile, a.commission_rate
    ORDER BY total_sales DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;