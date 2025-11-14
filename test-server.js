const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000; // Back to port 5000 as requested

// In-memory storage for testing (will persist during server session)
let employees = [
  {
    _id: '674350a1b2c3d4e5f6789001',
    employeeName: 'Rahul Patil',
    role: 'Sales Executive',
    department: 'Sales',
    salary: 35000,
    monthlyPerformance: 4,
    phoneNumber: '+91 9876543210',
    email: 'rahul.patil@company.com',
    joiningDate: '2024-01-15',
    isActive: true,
    photo: ''
  },
  {
    _id: '674350a1b2c3d4e5f6789002',
    employeeName: 'Priya Sharma',
    role: 'Marketing Executive',
    department: 'Marketing',
    salary: 32000,
    monthlyPerformance: 5,
    phoneNumber: '+91 9876543211',
    email: 'priya.sharma@company.com',
    joiningDate: '2024-02-01',
    isActive: true,
    photo: ''
  }
];

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend server is working!', 
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// Mock employee routes for testing
app.get('/api/employees', (req, res) => {
  console.log('📊 Employees API called - returning current employees:', employees.length);
  res.json(employees);
});

// Mock POST employee route
app.post('/api/employees', (req, res) => {
  console.log('📝 Add employee API called');
  console.log('Request body:', req.body);
  
  const newEmployee = {
    _id: '674350a1b2c3d4e5f6789' + Date.now().toString().slice(-3),
    ...req.body,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to in-memory storage
  employees.push(newEmployee);
  console.log(`✅ Employee added: ${newEmployee.employeeName} (Total employees: ${employees.length})`);
  
  res.status(201).json(newEmployee);
});

// Mock PUT employee route
app.put('/api/employees/:id', (req, res) => {
  console.log('📝 Update employee API called for ID:', req.params.id);
  console.log('Request body:', req.body);
  
  const employeeIndex = employees.findIndex(emp => emp._id === req.params.id);
  if (employeeIndex === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  // Update employee
  employees[employeeIndex] = {
    ...employees[employeeIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  console.log(`✅ Employee updated: ${employees[employeeIndex].employeeName}`);
  res.json(employees[employeeIndex]);
});

// Mock DELETE employee route
app.delete('/api/employees/:id', (req, res) => {
  console.log('🗑️ Delete employee API called for ID:', req.params.id);
  
  const employeeIndex = employees.findIndex(emp => emp._id === req.params.id);
  if (employeeIndex === -1) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  
  // Soft delete - set isActive to false
  employees[employeeIndex].isActive = false;
  console.log(`✅ Employee deleted: ${employees[employeeIndex].employeeName}`);
  
  res.json({ message: 'Employee deleted successfully' });
});

// Mock top performers route
app.get('/api/employees/top-performers', (req, res) => {
  console.log('🏆 Top performers API called');
  res.json([
    {
      name: 'Priya Sharma',
      score: 5,
      tasksCompleted: 15,
      month: 'November 2025',
      department: 'Marketing',
      role: 'Marketing Executive'
    },
    {
      name: 'Rahul Patil',
      score: 4,
      tasksCompleted: 12,
      month: 'November 2025',
      department: 'Sales',
      role: 'Sales Executive'
    }
  ]);
});

// Mock agents API for AgentCommission page
app.get('/api/agents', (req, res) => {
  console.log('👤 Agents API called');
  res.json({
    success: true,
    agents: [
      {
        _id: '674350a1b2c3d4e5f6789101',
        agentName: 'Rajesh Kumar',
        phoneNumber: '+91 9876543220',
        email: 'rajesh.kumar@company.com',
        commissionRate: 5,
        bankDetails: {
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'Rajesh Kumar'
        },
        totalSales: 15,
        totalCommission: 75000,
        isActive: true
      },
      {
        _id: '674350a1b2c3d4e5f6789102',
        agentName: 'Sunita Patil',
        phoneNumber: '+91 9876543221',
        email: 'sunita.patil@company.com',
        commissionRate: 4,
        bankDetails: {
          accountNumber: '0987654321',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          accountHolderName: 'Sunita Patil'
        },
        totalSales: 12,
        totalCommission: 60000,
        isActive: true
      }
    ]
  });
});

// Mock plots API for commission calculation
app.get('/api/plots', (req, res) => {
  console.log('🏘️ Plots API called');
  res.json({
    success: true,
    plots: [
      {
        _id: '674350a1b2c3d4e5f6789201',
        plotNumber: 'P-001',
        buyerName: 'Amit Sharma',
        salePrice: 500000,
        agentId: '674350a1b2c3d4e5f6789101',
        agentName: 'Rajesh Kumar',
        status: 'Sold',
        date: '2024-10-15'
      },
      {
        _id: '674350a1b2c3d4e5f6789202',
        plotNumber: 'P-002',
        buyerName: 'Priya Joshi',
        salePrice: 750000,
        agentId: '674350a1b2c3d4e5f6789102',
        agentName: 'Sunita Patil',
        status: 'Sold',
        date: '2024-10-20'
      }
    ]
  });
});

// Mock attendance route
app.post('/api/employees/:id/attendance', (req, res) => {
  console.log('📍 GPS check-in API called for employee:', req.params.id);
  console.log('Location data:', req.body);
  
  res.status(201).json({
    message: 'Check-in successful',
    attendance: {
      _id: 'att_' + Date.now(),
      employeeId: req.params.id,
      lat: req.body.lat,
      lng: req.body.lng,
      accuracy: req.body.accuracy,
      timestamp: new Date().toISOString(),
      checkInTime: new Date().toISOString()
    },
    lat: req.body.lat,
    lng: req.body.lng,
    accuracy: req.body.accuracy,
    timestamp: new Date().toISOString()
  });
});

// CONSTRUCTION MANAGEMENT MOCK ROUTES
let constructionExpenses = [];
let constructionIncome = [];

// Mock Construction Expenses Routes
app.get('/api/construction/expenses', (req, res) => {
  console.log('🏗️ Construction expenses GET API called');
  res.json({
    success: true,
    expenses: constructionExpenses,
    pagination: {
      current: 1,
      limit: 50,
      total: constructionExpenses.length,
      pages: 1
    }
  });
});

app.post('/api/construction/expenses', (req, res) => {
  console.log('🏗️ Construction expense POST API called');
  console.log('Request body:', req.body);
  
  const newExpense = {
    _id: 'exp_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  constructionExpenses.push(newExpense);
  console.log(`✅ Construction expense added: ${newExpense.category} (Total: ${constructionExpenses.length})`);
  
  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    expense: newExpense
  });
});

// Mock Construction Income Routes  
app.get('/api/construction/income', (req, res) => {
  console.log('🏗️ Construction income GET API called');
  res.json({
    success: true,
    income: constructionIncome,
    pagination: {
      current: 1,
      limit: 50,
      total: constructionIncome.length,
      pages: 1
    }
  });
});

app.post('/api/construction/income', (req, res) => {
  console.log('🏗️ Construction income POST API called');
  console.log('Request body:', req.body);
  
  const newIncome = {
    _id: 'inc_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  constructionIncome.push(newIncome);
  console.log(`✅ Construction income added: ${newIncome.source} (Total: ${constructionIncome.length})`);
  
  res.status(201).json({
    success: true,
    message: 'Income record created successfully',
    income: newIncome
  });
});

// Construction Analytics Routes
app.get('/api/construction/analytics', (req, res) => {
  console.log('📊 Construction analytics API called');
  
  const totalExpenses = constructionExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const totalIncome = constructionIncome.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
  const profit = totalIncome - totalExpenses;
  
  res.json({
    success: true,
    analytics: {
      totalExpenses,
      totalIncome,
      profit,
      profitMargin: totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(2) : 0
    }
  });
});

// DEVELOPMENT SITE CONTROL MOCK ROUTES  
let developmentSites = [
  {
    id: 'DS001',
    name: 'Jat Township Phase 1',
    totalIncome: 2500000,
    totalExpense: 1800000,
    profit: 700000,
    status: 'profit',
    workTypes: { jcb: 400000, diesel: 350000, labor: 600000, material: 450000 },
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'DS002', 
    name: 'Karad Commercial Complex',
    totalIncome: 3200000,
    totalExpense: 2100000,
    profit: 1100000,
    status: 'profit',
    workTypes: { jcb: 500000, diesel: 300000, labor: 800000, material: 500000 },
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'DS003',
    name: 'Satara Highway Project',
    totalIncome: 1800000,
    totalExpense: 2200000,
    profit: -400000,
    status: 'loss',
    workTypes: { jcb: 600000, diesel: 400000, labor: 700000, material: 500000 },
    lastUpdated: new Date().toISOString()
  }
];

app.get('/api/development/sites', (req, res) => {
  console.log('🏗️ Development sites API called');
  res.json(developmentSites);
});

// Mock plots route (without MongoDB for testing)
app.get('/api/plots', (req, res) => {
  console.log('📊 Plots API called - sending mock data');
  res.json({ 
    success: true,
    message: 'Mock data from test server',
    plots: [
      {
        _id: '674350a1b2c3d4e5f6789012',
        plotNumber: 'P-001',
        buyerName: 'Rahul Patil',
        sellerName: 'Suresh Kumar',
        village: 'Jat',
        area: '1200 sq.ft',
        location: 'Near School',
        purchasePrice: 180000,
        salePrice: 250000,
        profit: 70000,
        paymentMode: 'GPay',
        date: '2024-10-15',
        status: 'Sold',
        buyerPhoto: '/uploads/buyerPhoto/sample-photo-1.jpg',
        buyerSignature: '/uploads/buyerSignature/sample-signature-1.jpg'
      },
      {
        _id: '674350a1b2c3d4e5f6789013',
        plotNumber: 'P-002',
        buyerName: 'Priya Sharma',
        sellerName: 'Amit Desai',
        village: 'Karad',
        area: '1500 sq.ft',
        location: 'Main Road',
        purchasePrice: 220000,
        salePrice: 0,
        profit: 0,
        paymentMode: 'Cash',
        date: '2024-10-20',
        status: 'Available',
        buyerPhoto: null,
        buyerSignature: null
      }
    ]
  });
});

// Mock POST route for adding plots
app.post('/api/plots', (req, res) => {
  console.log('📝 Add plot API called');
  console.log('Request body:', req.body);
  
  res.json({
    success: true,
    message: 'Plot added successfully (mock)',
    plot: {
      _id: '674350a1b2c3d4e5f6789014',
      ...req.body,
      createdAt: new Date().toISOString()
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: err.message 
  });
});

app.listen(PORT, () => {
  console.log('🎯='.repeat(30));
  console.log('🎯 SOMANING KOLI - Property Suite Backend (TEST)');
  console.log('🎯='.repeat(30));
  console.log(`✅ TEST Server running on port ${PORT}`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
  console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
  console.log(`👥 Employees API: http://localhost:${PORT}/api/employees`);
  console.log(`🏆 Top Performers: http://localhost:${PORT}/api/employees/top-performers`);
  console.log(`🏗️ Construction Expenses: http://localhost:${PORT}/api/construction/expenses`);
  console.log(`💰 Construction Income: http://localhost:${PORT}/api/construction/income`);
  console.log(`📊 Construction Analytics: http://localhost:${PORT}/api/construction/analytics`);
  console.log(`🏘️ Development Sites: http://localhost:${PORT}/api/development/sites`);
  console.log('🎯='.repeat(30));
  console.log('⚠️  This is a TEST server with mock data');
  console.log('⚠️  No MongoDB required - perfect for testing frontend');
  console.log('🎯='.repeat(30));
  console.log('📝 Ready to test Employee Module & Construction Management!');
});