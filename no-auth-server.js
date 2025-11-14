const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting NO-AUTH MongoDB server...');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/somaning-property-suite';

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  console.log('📦 Database: somaning-property-suite');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('⚠️  Continuing with in-memory storage...');
});

// MongoDB Schemas
const plotSchema = new mongoose.Schema({
  plotNumber: { type: String, required: true, unique: true },
  buyerName: { type: String, required: true },
  sellerName: { type: String, required: true },
  village: { type: String, required: true },
  area: { type: String, required: true },
  location: { type: String, required: true },
  purchasePrice: { type: Number, required: true },
  salePrice: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  paymentMode: { type: String, default: 'Cash' },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Available' },
  // GST fields
  includeGST: { type: Boolean, default: false },
  gstPercentage: { type: Number, default: 18 },
  purchasePriceGST: { type: Number, default: 0 },
  salePriceGST: { type: Number, default: 0 },
  purchasePriceWithGST: { type: Number, default: 0 },
  salePriceWithGST: { type: Number, default: 0 },
  // Photos & Signatures
  buyerPhoto: { type: String },
  buyerSignature: { type: String },
  sellerPhoto: { type: String },
  sellerSignature: { type: String }
}, { timestamps: true });

const agentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  address: { type: String },
  bankAccount: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  commissionRate: { type: Number, default: 2.5 },
  photo: { type: String },
  signature: { type: String },
  totalCommission: { type: Number, default: 0 },
  paidCommission: { type: Number, default: 0 },
  pendingCommission: { type: Number, default: 0 },
  plots: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Plot = mongoose.model('Plot', plotSchema);
const Agent = mongoose.model('Agent', agentSchema);

// Employee Schema
const employeeSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  photo: { type: String },
  role: { type: String },
  department: { type: String },
  salary: { type: Number },
  monthlyPerformance: { type: Number, min: 1, max: 5 },
  phoneNumber: { type: String },
  email: { type: String },
  joiningDate: { type: Date },
  address: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);

// Attendance Schema
const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: { type: Number },
  deviceInfo: { type: String },
  timestamp: { type: Date, default: Date.now },
  checkInTime: { type: Date, default: Date.now }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

// Advance Transaction Schema
const advanceTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String },
  plotNumber: { type: String },
  transactionType: { 
    type: String, 
    required: true,
    enum: ['Advance In', 'Advance Out', 'Plot Sale', 'Agent Commission', 'Payment Due', 'Document Collection', 'Follow Up']
  },
  category: {
    type: String,
    required: true,
    enum: ['Advance Received', 'Advance Given', 'Plot Deal', 'Commission', 'Document', 'Follow Up', 'Other']
  },
  amount: { type: Number, required: true },
  description: { type: String },
  notes: { type: String },
  transactionDate: { type: Date, required: true },
  expectedConversionDate: { type: Date },
  status: {
    type: String,
    enum: ['Pending', 'Converted', 'Cancelled', 'Completed'],
    default: 'Pending'
  },
  isConverted: { type: Boolean, default: false },
  convertedToSaleId: { type: String },
  convertedDate: { type: Date },
  paymentMode: { type: String, default: 'Cash' },
  village: { type: String },
  location: { type: String },
  agentId: { type: String },
  agentName: { type: String },
  // Additional tracking fields
  daysWaiting: { type: Number, default: 0 },
  isOverdue: { type: Boolean, default: false },
  lastReminderDate: { type: Date },
  // Documents and signatures
  documents: [{ type: String }],
  customerSignature: { type: String },
  agentSignature: { type: String }
}, { timestamps: true });

// Pre-save middleware to calculate days waiting
advanceTransactionSchema.pre('save', function(next) {
  if (this.status === 'Pending' && this.transactionDate) {
    const today = new Date();
    const transactionDate = new Date(this.transactionDate);
    this.daysWaiting = Math.floor((today - transactionDate) / (1000 * 60 * 60 * 24));
    
    // Mark as overdue if more than 30 days for advance transactions
    if (this.daysWaiting > 30 && (this.transactionType === 'Advance In' || this.transactionType === 'Advance Out')) {
      this.isOverdue = true;
    }
  }
  next();
});

// Static methods for analytics
advanceTransactionSchema.statics.getAnalytics = async function(startDate, endDate) {
  const matchQuery = {};
  if (startDate && endDate) {
    matchQuery.transactionDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const analytics = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalAdvanceIn: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", "Advance In"] }, "$amount", 0]
          }
        },
        totalAdvanceOut: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", "Advance Out"] }, "$amount", 0]
          }
        },
        totalTransactions: { $sum: 1 },
        pendingCount: {
          $sum: {
            $cond: [{ $eq: ["$status", "Pending"] }, 1, 0]
          }
        }
      }
    }
  ]);

  return analytics[0] || {
    totalAdvanceIn: 0,
    totalAdvanceOut: 0,
    totalTransactions: 0,
    pendingCount: 0
  };
};

advanceTransactionSchema.statics.getDailyAnalytics = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    { $match: { transactionDate: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" } },
        advanceIn: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", "Advance In"] }, "$amount", 0]
          }
        },
        advanceOut: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", "Advance Out"] }, "$amount", 0]
          }
        },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

advanceTransactionSchema.statics.getMonthlyAnalytics = async function(months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return await this.aggregate([
    { $match: { transactionDate: { $gte: startDate } } },
    {
      $group: {
        _id: { 
          year: { $year: "$transactionDate" },
          month: { $month: "$transactionDate" }
        },
        advanceIn: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", "Advance In"] }, "$amount", 0]
          }
        },
        advanceOut: {
          $sum: {
            $cond: [{ $eq: ["$transactionType", "Advance Out"] }, "$amount", 0]
          }
        },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
};

const AdvanceTransaction = mongoose.model('AdvanceTransaction', advanceTransactionSchema);

// Import Payment model
const Payment = require('./models/Payment');

// Import Reminder model
const Reminder = require('./models/Reminder');

// Import Reminder Service
const reminderService = require('./services/reminderService');

// In-memory data store
let plots = [
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
    // GST fields
    includeGST: false,
    gstPercentage: 18,
    purchasePriceGST: 0,
    salePriceGST: 0,
    purchasePriceWithGST: 180000,
    salePriceWithGST: 250000,
    buyerPhoto: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNEY0NkU1IiByeD0iNCIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlI8L3RleHQ+Cjwvc3ZnPgo=',
    buyerSignature: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDU5NjY5IiByeD0iNCIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKckzwvdGV4dD4KPC9zdmc+Cg==',
    sellerPhoto: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMTU4MDNEIiByeD0iNCIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlM8L3RleHQ+Cjwvc3ZnPgo=',
    sellerSignature: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDc0NzlEIiByeD0iNCIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKckzwvdGV4dD4KPC9zdmc+Cg==',
    createdAt: '2024-10-15T10:00:00.000Z'
  }
];

let agents = [
  {
    id: 1,
    name: 'Suresh Patil',
    phone: '9876543210',
    email: 'suresh@email.com',
    address: 'Jat, Sangli',
    bankAccount: '123456789',
    ifscCode: 'AXIS0001234',
    bankName: 'Axis Bank',
    commissionRate: 2.5,
    photo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNEY0NkU1IiByeD0iMTAiLz4KPHRleHQgeD0iNTAiIHk9IjYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TPC90ZXh0Pgo8L3N2Zz4K',
    signature: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMjAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjAgNDBRNDAgMjAgNjAgNDBUMTAwIDQwUTEyMCAyMCAxNDAgNDBUMTgwIDQwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K',
    totalCommission: 125000,
    paidCommission: 100000,
    pendingCommission: 25000,
    plots: ['P-001', 'P-003', 'P-007'],
    isActive: true,
    createdAt: '2024-10-15T10:00:00.000Z'
  },
  {
    id: 2,
    name: 'Rajesh Kumar',
    phone: '8765432109',
    email: 'rajesh@email.com',
    address: 'Miraj, Sangli',
    bankAccount: '987654321',
    ifscCode: 'HDFC0002345',
    bankName: 'HDFC Bank',
    commissionRate: 3.0,
    photo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjMDU5NjY5IiByeD0iMTAiLz4KPHRleHQgeD0iNTAiIHk9IjYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNDIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5SPC90ZXh0Pgo8L3N2Zz4K',
    signature: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMjAwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjAgNDBRNDAgNjAgNjAgNDBUMTAwIDQwUTEyMCA2MCAxNDAgNDBUMTgwIDQwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4K',
    totalCommission: 85000,
    paidCommission: 85000,
    pendingCommission: 0,
    plots: ['P-002', 'P-005'],
    isActive: true,
    createdAt: '2024-10-20T10:00:00.000Z'
  }
];

let nextAgentId = 3;

// In-memory employee storage
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
    photo: '',
    address: 'Jat, Sangli'
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
    photo: '',
    address: 'Karad, Satara'
  }
];

// CORS - allow all origins for development
app.use(cors({
  origin: '*',
  credentials: false
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test route
app.get('/api/test', (req, res) => {
  console.log('📡 Test endpoint called');
  res.json({ 
    message: 'NO-AUTH MongoDB Backend server is working!', 
    timestamp: new Date().toISOString(),
    status: 'OK',
    server: 'NO-AUTH Backend (MongoDB)',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Simple mock login endpoint for NO-AUTH mode (register BEFORE real auth routes)
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 POST /api/auth/login called - NO AUTH mode');
  console.log('Login attempt:', req.body);
  
  const { email, password } = req.body;
  
  // Mock user validation for development
  if (email === 'admin@propertysuitedev.com' && password === 'admin@123') {
    const mockToken = 'mock-jwt-token-for-development-' + Date.now();
    const mockUser = {
      id: 'admin-001',
      email: 'admin@propertysuitedev.com',
      name: 'Admin User',
      role: 'Admin',
      mobile: '+91-9876543210',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    console.log('✅ Mock login successful');
    return res.json({
      success: true,
      message: 'Login successful (NO-AUTH mode)',
      token: mockToken,
      user: mockUser
    });
  }
  
  console.log('❌ Mock login failed - invalid credentials');
  res.status(401).json({
    success: false,
    error: 'Invalid credentials',
    message: 'Login failed'
  });
});

// Auth Routes for OTP functionality and other endpoints (registered AFTER mock login)
app.use('/api/auth', require('./routes/auth'));

// Payment Routes - NO AUTHENTICATION REQUIRED for now  
app.use('/api/payments', require('./routes/payments'));

// Document Vault Routes - NO AUTHENTICATION REQUIRED for now
try {
  app.use('/api/documents', require('./routes/documents-noauth'));
  console.log('✅ Document vault routes loaded successfully (NO-AUTH mode)');
} catch (error) {
  console.error('❌ Error loading document vault routes:', error.message);
}

// Construction Management Routes - NO AUTHENTICATION REQUIRED for now
try {
  app.use('/api/construction', require('./routes/construction'));
  console.log('✅ Construction routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading construction routes:', error.message);
  
  // Create minimal construction routes if the file doesn't exist
  const express = require('express');
  const constructionRouter = express.Router();
  
  // Test route
  constructionRouter.get('/test', (req, res) => {
    console.log('📡 Construction test endpoint called');
    res.json({
      success: true,
      message: 'Construction API is working!',
      timestamp: new Date().toISOString()
    });
  });
  
  // Minimal expense routes for testing
  constructionRouter.get('/expenses', (req, res) => {
    console.log('📊 GET /api/construction/expenses called');
    res.json({
      success: true,
      expenses: [],
      message: 'Construction expenses endpoint working'
    });
  });
  
  constructionRouter.post('/expenses', (req, res) => {
    console.log('📝 POST /api/construction/expenses called');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Basic validation
    if (!req.body.category) {
      console.log('❌ Validation error: category is required');
      return res.status(400).json({
        success: false,
        error: 'Category is required',
        receivedData: req.body
      });
    }
    
    // Check if required fields are present based on category
    const { category } = req.body;
    let validationError = null;
    
    if (category === 'material') {
      if (!req.body.itemName || !req.body.quantity || !req.body.rate || !req.body.supplier) {
        validationError = 'Material category requires: itemName, quantity, rate, supplier';
      }
    } else if (category === 'labor') {
      if (!req.body.workerName || !req.body.days || !req.body.dailyWage || !req.body.workType) {
        validationError = 'Labor category requires: workerName, days, dailyWage, workType';
      }
    } else if (category === 'contractor') {
      if (!req.body.contractorName || !req.body.workDetails || !req.body.contractAmount) {
        validationError = 'Contractor category requires: contractorName, workDetails, contractAmount';
      }
    } else if (category === 'engineer') {
      if (!req.body.engineerName || !req.body.serviceType || !req.body.fees) {
        validationError = 'Engineer category requires: engineerName, serviceType, fees';
      }
    }
    
    if (validationError) {
      console.log('❌ Validation error:', validationError);
      return res.status(400).json({
        success: false,
        error: validationError,
        receivedData: req.body,
        hint: 'Please ensure all required fields are filled'
      });
    }
    
    // If validation passes, create the expense
    const newExpense = {
      _id: Date.now(),
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('✅ Expense validation passed, created:', newExpense._id);
    res.status(201).json({
      success: true,
      message: 'Expense created successfully (test mode)',
      expense: newExpense
    });
  });
  
  // Minimal income routes
  constructionRouter.get('/income', (req, res) => {
    console.log('📊 GET /api/construction/income called');
    res.json({
      success: true,
      income: [],
      message: 'Construction income endpoint working'
    });
  });
  
  constructionRouter.post('/income', (req, res) => {
    console.log('📝 POST /api/construction/income called');
    console.log('Request body:', req.body);
    res.status(201).json({
      success: true,
      message: 'Income created successfully (test mode)',
      income: { ...req.body, _id: Date.now(), createdAt: new Date() }
    });
  });
  
  app.use('/api/construction', constructionRouter);
  console.log('⚠️ Using fallback construction routes');
}

// Development Site Control Routes - NO AUTHENTICATION REQUIRED for now
try {
  app.use('/api/development', require('./routes/development'));
  console.log('✅ Development routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading development routes:', error.message);
  
  // Create minimal development routes if the file doesn't exist
  const express = require('express');
  const developmentRouter = express.Router();
  
  developmentRouter.get('/test', (req, res) => {
    console.log('📡 Development test endpoint called');
    res.json({
      success: true,
      message: 'Development API is working!',
      timestamp: new Date().toISOString()
    });
  });
  
  app.use('/api/development', developmentRouter);
  console.log('⚠️ Using fallback development routes');
}

// GET all plots - NO AUTHENTICATION REQUIRED
app.get('/api/plots', async (req, res) => {
  console.log('📊 GET /api/plots called - NO AUTH');
  
  // If MongoDB is connected, use it; otherwise fallback to memory
  if (mongoose.connection.readyState === 1) {
    try {
      const docs = await Plot.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({
        success: true,
        message: `Loaded ${docs.length} plots from MongoDB`,
        plots: docs
      });
    } catch (error) {
      console.error('❌ Error fetching plots from MongoDB:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch plots: ' + error.message
      });
    }
  }

  // Fallback - in-memory
  return res.status(200).json({
    success: true,
    message: `Loaded ${plots.length} plots from memory (DB disconnected)`,
    plots: plots
  });
});

// POST - Add new plot - NO AUTHENTICATION REQUIRED
app.post('/api/plots', async (req, res) => {
  console.log('📝 POST /api/plots called - NO AUTH');
  // Avoid logging large base64 images to prevent console overflow
  const { buyerPhoto, buyerSignature, sellerPhoto, sellerSignature, ...safeBody } = req.body || {};
  console.log('Request summary:', {
    ...safeBody,
    buyerPhoto: buyerPhoto ? `[image:${buyerPhoto.length} chars]` : undefined,
    buyerSignature: buyerSignature ? `[image:${buyerSignature.length} chars]` : undefined,
    sellerPhoto: sellerPhoto ? `[image:${sellerPhoto.length} chars]` : undefined,
    sellerSignature: sellerSignature ? `[image:${sellerSignature.length} chars]` : undefined,
  });

  try {
    // Calculate profit and GST fields
    const purchasePrice = parseFloat(req.body.purchasePrice) || 0;
    const salePrice = parseFloat(req.body.salePrice) || 0;
    const profit = salePrice > 0 ? salePrice - purchasePrice : 0;

    const includeGST = !!req.body.includeGST;
    const gstPercentage = req.body.gstPercentage ? parseFloat(req.body.gstPercentage) : 18;
    const purchasePriceGST = includeGST ? (purchasePrice * gstPercentage) / 100 : 0;
    const salePriceGST = includeGST ? (salePrice * gstPercentage) / 100 : 0;
    const purchasePriceWithGST = includeGST ? purchasePrice + purchasePriceGST : purchasePrice;
    const salePriceWithGST = includeGST ? salePrice + salePriceGST : salePrice;

    if (mongoose.connection.readyState === 1) {
      const doc = await Plot.create({
        ...req.body,
        purchasePrice,
        salePrice,
        profit,
        includeGST,
        gstPercentage,
        purchasePriceGST,
        salePriceGST,
        purchasePriceWithGST,
        salePriceWithGST
      });

      return res.status(201).json({
        success: true,
        message: 'Plot added successfully (MongoDB)',
        plot: doc
      });
    }

    // Fallback to in-memory when DB disconnected
    const newPlot = {
      _id: Date.now().toString(),
      ...req.body,
      purchasePrice,
      salePrice,
      profit,
      includeGST,
      gstPercentage,
      purchasePriceGST,
      salePriceGST,
      purchasePriceWithGST,
      salePriceWithGST,
      createdAt: new Date().toISOString()
    };
    plots.push(newPlot);
    console.log('⚠️ DB disconnected - plot saved to memory:', newPlot._id);
    return res.status(201).json({ success: true, message: 'Plot added (memory)', plot: newPlot });
  } catch (error) {
    console.error('❌ Error saving plot:', error);
    res.status(500).json({ success: false, message: 'Failed to save plot: ' + error.message });
  }
});

// PUT - Update plot - NO AUTHENTICATION REQUIRED
app.put('/api/plots/:id', async (req, res) => {
  console.log('✏️ PUT /api/plots/' + req.params.id + ' called - NO AUTH');

  try {
    // Calculate profit and GST fields
    const purchasePrice = parseFloat(req.body.purchasePrice) || 0;
    const salePrice = parseFloat(req.body.salePrice) || 0;
    const profit = salePrice > 0 ? salePrice - purchasePrice : 0;

    const includeGST = !!req.body.includeGST;
    const gstPercentage = req.body.gstPercentage ? parseFloat(req.body.gstPercentage) : 18;
    const purchasePriceGST = includeGST ? (purchasePrice * gstPercentage) / 100 : 0;
    const salePriceGST = includeGST ? (salePrice * gstPercentage) / 100 : 0;
    const purchasePriceWithGST = includeGST ? purchasePrice + purchasePriceGST : purchasePrice;
    const salePriceWithGST = includeGST ? salePrice + salePriceGST : salePrice;

    if (mongoose.connection.readyState === 1) {
      const updated = await Plot.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          purchasePrice,
          salePrice,
          profit,
          includeGST,
          gstPercentage,
          purchasePriceGST,
          salePriceGST,
          purchasePriceWithGST,
          salePriceWithGST
        },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Plot not found' });
      }
      return res.status(200).json({ success: true, message: 'Plot updated successfully (MongoDB)', plot: updated });
    }

    // Fallback to in-memory
    const plotIndex = plots.findIndex(p => p._id === req.params.id);
    if (plotIndex === -1) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }
    const updatedPlot = {
      ...plots[plotIndex],
      ...req.body,
      purchasePrice,
      salePrice,
      profit,
      includeGST,
      gstPercentage,
      purchasePriceGST,
      salePriceGST,
      purchasePriceWithGST,
      salePriceWithGST
    };
    plots[plotIndex] = updatedPlot;
    console.log('⚠️ DB disconnected - plot updated in memory:', updatedPlot._id);
    return res.status(200).json({ success: true, message: 'Plot updated (memory)', plot: updatedPlot });
  } catch (error) {
    console.error('❌ Error updating plot:', error);
    res.status(500).json({ success: false, message: 'Failed to update plot: ' + error.message });
  }
});

// DELETE - Delete plot - NO AUTHENTICATION REQUIRED
app.delete('/api/plots/:id', async (req, res) => {
  console.log('🗑️ DELETE /api/plots/' + req.params.id + ' called - NO AUTH');

  try {
    if (mongoose.connection.readyState === 1) {
      const deleted = await Plot.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Plot not found' });
      }
      return res.status(200).json({ success: true, message: 'Plot deleted successfully (MongoDB)', plot: deleted });
    }

    // Fallback to in-memory
    const plotIndex = plots.findIndex(p => p._id === req.params.id);
    if (plotIndex === -1) {
      return res.status(404).json({ success: false, message: 'Plot not found' });
    }
    const deletedPlot = plots[plotIndex];
    plots.splice(plotIndex, 1);
    console.log('⚠️ DB disconnected - plot deleted from memory:', deletedPlot._id);
    return res.status(200).json({ success: true, message: 'Plot deleted (memory)', plot: deletedPlot });
  } catch (error) {
    console.error('❌ Error deleting plot:', error);
    res.status(500).json({ success: false, message: 'Failed to delete plot: ' + error.message });
  }
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


// ==================== REMINDERS ROUTES ====================

// GET all reminders with search and filter
app.get('/api/reminders', async (req, res) => {
  console.log('📋 GET /api/reminders called - NO AUTH');
  
  try {
    const { 
      category, 
      status, 
      transactionType, 
      search, 
      page = 1, 
      limit = 50,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;
    
    // Build query
    let query = { isActive: true };
    
    if (category && category !== 'All') {
      query.category = category;
    }
    
    if (status && status !== 'All') {
      query.status = status;
    }
    
    if (transactionType && transactionType !== 'All') {
      query.transactionType = transactionType;
    }
    
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    if (mongoose.connection.readyState === 1) {
      const reminders = await Reminder.find(query)
        .populate('plotId', 'plotNumber village')
        .populate('agentId', 'name phone')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
      
      const total = await Reminder.countDocuments(query);
      
      return res.json({
        success: true,
        message: `Loaded ${reminders.length} reminders from MongoDB`,
        reminders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }
    
    // Fallback to empty array
    return res.json({
      success: true,
      message: 'No reminders available (DB disconnected)',
      reminders: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 }
    });
    
  } catch (error) {
    console.error('❌ Error fetching reminders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reminders: ' + error.message 
    });
  }
});

// GET due reminders (for auto-reminder system) - MUST BE BEFORE /:id route
app.get('/api/reminders/system/due', async (req, res) => {
  console.log('🔔 GET /api/reminders/system/due called - NO AUTH');
  
  try {
    if (mongoose.connection.readyState === 1) {
      const dueReminders = await Reminder.findDueReminders();
      
      return res.json({
        success: true,
        message: `Found ${dueReminders.length} due reminders`,
        reminders: dueReminders
      });
    }
    
    return res.json({
      success: true,
      message: 'No due reminders (DB disconnected)',
      reminders: []
    });
    
  } catch (error) {
    console.error('❌ Error fetching due reminders:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch due reminders: ' + error.message 
    });
  }
});

// POST mark reminder as sent - MUST BE BEFORE /:id route
app.post('/api/reminders/:id/mark-sent', async (req, res) => {
  console.log(`📤 POST /api/reminders/${req.params.id}/mark-sent called - NO AUTH`);
  
  try {
    if (mongoose.connection.readyState === 1) {
      const reminder = await Reminder.findById(req.params.id);
      
      if (!reminder) {
        return res.status(404).json({ success: false, message: 'Reminder not found' });
      }
      
      await reminder.markReminderSent();
      
      return res.json({
        success: true,
        message: 'Reminder marked as sent',
        reminder
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Database not available' 
    });
    
  } catch (error) {
    console.error('❌ Error marking reminder as sent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark reminder as sent: ' + error.message 
    });
  }
});

// GET single reminder by ID
app.get('/api/reminders/:id', async (req, res) => {
  console.log(`📋 GET /api/reminders/${req.params.id} called - NO AUTH`);
  
  try {
    if (mongoose.connection.readyState === 1) {
      const reminder = await Reminder.findById(req.params.id)
        .populate('plotId')
        .populate('agentId')
        .lean();
      
      if (!reminder) {
        return res.status(404).json({ success: false, message: 'Reminder not found' });
      }
      
      return res.json({ success: true, reminder });
    }
    
    return res.status(404).json({ success: false, message: 'Reminder not found (DB disconnected)' });
    
  } catch (error) {
    console.error('❌ Error fetching reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reminder: ' + error.message 
    });
  }
});

// POST create new reminder
app.post('/api/reminders', async (req, res) => {
  console.log('➕ POST /api/reminders called - NO AUTH');
  
  try {
    const {
      title,
      description,
      customerName,
      customerPhone,
      customerEmail,
      dueDate,
      reminderTime,
      transactionType,
      category,
      amount,
      plotId,
      agentId,
      notes,
      autoReminder = true
    } = req.body;
    
    // Validation
    if (!title || !customerName || !customerPhone || !dueDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, customer name, phone, and due date are required' 
      });
    }
    
    if (mongoose.connection.readyState === 1) {
      const reminderData = {
        title: title.trim(),
        description: description?.trim() || '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail?.trim() || '',
        dueDate: new Date(dueDate),
        reminderTime: reminderTime || '10:00',
        transactionType: transactionType || 'Follow Up',
        category: category || 'Other',
        amount: amount || 0,
        plotId: plotId || null,
        agentId: agentId || null,
        notes: notes?.trim() || '',
        autoReminder,
        digitalSignature: {},
        documents: []
      };
      
      const reminder = await Reminder.create(reminderData);
      
      return res.status(201).json({
        success: true,
        message: 'Reminder created successfully',
        reminder
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Database not available' 
    });
    
  } catch (error) {
    console.error('❌ Error creating reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create reminder: ' + error.message 
    });
  }
});

// PUT update reminder
app.put('/api/reminders/:id', async (req, res) => {
  console.log(`✏️ PUT /api/reminders/${req.params.id} called - NO AUTH`);
  
  try {
    const updates = { ...req.body };
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    if (mongoose.connection.readyState === 1) {
      const reminder = await Reminder.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      );
      
      if (!reminder) {
        return res.status(404).json({ success: false, message: 'Reminder not found' });
      }
      
      return res.json({
        success: true,
        message: 'Reminder updated successfully',
        reminder
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Database not available' 
    });
    
  } catch (error) {
    console.error('❌ Error updating reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update reminder: ' + error.message 
    });
  }
});

// DELETE reminder
app.delete('/api/reminders/:id', async (req, res) => {
  console.log(`🗑️ DELETE /api/reminders/${req.params.id} called - NO AUTH`);
  
  try {
    if (mongoose.connection.readyState === 1) {
      const reminder = await Reminder.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );
      
      if (!reminder) {
        return res.status(404).json({ success: false, message: 'Reminder not found' });
      }
      
      return res.json({
        success: true,
        message: 'Reminder deleted successfully'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Database not available' 
    });
    
  } catch (error) {
    console.error('❌ Error deleting reminder:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete reminder: ' + error.message 
    });
  }
});

// ==================== END REMINDERS ROUTES ====================


// ==================== AGENTS ROUTES ====================

// GET all agents - NO AUTHENTICATION REQUIRED
app.get('/api/agents', async (req, res) => {
  console.log('📋 GET /api/agents called - NO AUTH');

  if (mongoose.connection.readyState === 1) {
    try {
      const docs = await Agent.find().sort({ createdAt: -1 }).lean();
      const agentsMapped = docs.map(d => ({ ...d, id: d._id }));
      return res.status(200).json({
        success: true,
        message: `Loaded ${agentsMapped.length} agents from MongoDB`,
        agents: agentsMapped
      });
    } catch (error) {
      console.error('❌ Error fetching agents from MongoDB:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch agents: ' + error.message });
    }
  }

  // Fallback to in-memory
  return res.status(200).json({
    success: true,
    message: `Loaded ${agents.length} agents from memory (DB disconnected)`,
    agents: agents
  });
});

// GET single agent by ID
app.get('/api/agents/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`👤 GET /api/agents/${id} called - NO AUTH`);

  if (mongoose.connection.readyState === 1) {
    try {
      const doc = await Agent.findById(id).lean();
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      return res.status(200).json({ success: true, agent: { ...doc, id: doc._id } });
    } catch (error) {
      console.error('❌ Error fetching agent:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch agent: ' + error.message });
    }
  }

  // Fallback - in memory numeric id
  const agent = agents.find(a => a.id === parseInt(id));
  if (!agent) {
    return res.status(404).json({ success: false, message: 'Agent not found' });
  }
  return res.status(200).json({ success: true, agent });
});

// POST create new agent - NO AUTHENTICATION REQUIRED
app.post('/api/agents', async (req, res) => {
  console.log('➕ POST /api/agents called - NO AUTH');

  try {
    const {
      name,
      phone,
      email,
      address,
      bankAccount,
      ifscCode,
      bankName,
      commissionRate,
      photo,
      signature
    } = req.body;

    // Validation
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    if (mongoose.connection.readyState === 1) {
      // Check unique phone
      const exists = await Agent.findOne({ phone: phone.trim() }).lean();
      if (exists) {
        return res.status(409).json({ success: false, message: 'Agent with this phone number already exists' });
      }

      const doc = await Agent.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || '',
        address: address?.trim() || '',
        bankAccount: bankAccount?.trim() || '',
        ifscCode: (ifscCode?.trim()?.toUpperCase()) || '',
        bankName: bankName?.trim() || '',
        commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : 2.5,
        photo: photo || null,
        signature: signature || null,
        totalCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
        plots: [],
        isActive: true
      });

      return res.status(201).json({ success: true, message: 'Agent created successfully (MongoDB)', agent: { ...doc.toObject(), id: doc._id } });
    }

    // Fallback to in-memory
    const existingAgent = agents.find(a => a.phone === phone);
    if (existingAgent) {
      return res.status(400).json({ success: false, message: 'Agent with this phone number already exists' });
    }

    const newAgent = {
      id: nextAgentId++,
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      address: address?.trim() || '',
      bankAccount: bankAccount?.trim() || '',
      ifscCode: ifscCode?.trim().toUpperCase() || '',
      bankName: bankName?.trim() || '',
      commissionRate: parseFloat(commissionRate) || 2.5,
      photo: photo || null,
      signature: signature || null,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      plots: [],
      isActive: true,
      createdAt: new Date().toISOString()
    };
    agents.push(newAgent);
    console.log(`⚠️ DB disconnected - agent created in memory: ${newAgent.name}`);
    return res.status(201).json({ success: true, message: 'Agent created (memory)', agent: newAgent });
  } catch (error) {
    console.error('❌ Error creating agent:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// PUT update agent - NO AUTHENTICATION REQUIRED
app.put('/api/agents/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`✏️ PUT /api/agents/${id} called - NO AUTH`);

  try {
    const {
      name,
      phone,
      email,
      address,
      bankAccount,
      ifscCode,
      bankName,
      commissionRate,
      photo,
      signature,
      totalCommission,
      paidCommission
    } = req.body;

    if (mongoose.connection.readyState === 1) {
      // Check phone uniqueness if changed
      if (phone) {
        const exists = await Agent.findOne({ phone: phone.trim(), _id: { $ne: id } }).lean();
        if (exists) {
          return res.status(409).json({ success: false, message: 'Agent with this phone number already exists' });
        }
      }

      // Build update object
      const update = {};
      if (name !== undefined) update.name = name.trim();
      if (phone !== undefined) update.phone = phone.trim();
      if (email !== undefined) update.email = email.trim();
      if (address !== undefined) update.address = address.trim();
      if (bankAccount !== undefined) update.bankAccount = bankAccount.trim();
      if (ifscCode !== undefined) update.ifscCode = ifscCode.trim().toUpperCase();
      if (bankName !== undefined) update.bankName = bankName.trim();
      if (commissionRate !== undefined) update.commissionRate = parseFloat(commissionRate);
      if (photo !== undefined) update.photo = photo;
      if (signature !== undefined) update.signature = signature;
      if (totalCommission !== undefined) update.totalCommission = parseFloat(totalCommission);
      if (paidCommission !== undefined) update.paidCommission = parseFloat(paidCommission);

      if (update.totalCommission !== undefined || update.paidCommission !== undefined) {
        // Need current values to compute pendingCommission
        const current = await Agent.findById(id).lean();
        const total = update.totalCommission !== undefined ? update.totalCommission : current.totalCommission || 0;
        const paid = update.paidCommission !== undefined ? update.paidCommission : current.paidCommission || 0;
        update.pendingCommission = total - paid;
      }

      const updated = await Agent.findByIdAndUpdate(id, update, { new: true });
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      return res.status(200).json({ success: true, message: 'Agent updated successfully (MongoDB)', agent: { ...updated.toObject(), id: updated._id } });
    }

    // Fallback to in-memory
    const agentIndex = agents.findIndex(a => a.id === parseInt(id));
    if (agentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    // Check if phone is being changed and if it exists
    if (phone && phone !== agents[agentIndex].phone) {
      const existingAgent = agents.find(a => a.phone === phone && a.id !== parseInt(id));
      if (existingAgent) {
        return res.status(400).json({ success: false, message: 'Agent with this phone number already exists' });
      }
    }

    const updatedAgent = {
      ...agents[agentIndex],
      name: name?.trim() || agents[agentIndex].name,
      phone: phone?.trim() || agents[agentIndex].phone,
      email: email?.trim() || agents[agentIndex].email,
      address: address?.trim() || agents[agentIndex].address,
      bankAccount: bankAccount?.trim() || agents[agentIndex].bankAccount,
      ifscCode: ifscCode?.trim().toUpperCase() || agents[agentIndex].ifscCode,
      bankName: bankName?.trim() || agents[agentIndex].bankName,
      commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : agents[agentIndex].commissionRate,
      photo: photo !== undefined ? photo : agents[agentIndex].photo,
      signature: signature !== undefined ? signature : agents[agentIndex].signature,
      totalCommission: totalCommission !== undefined ? parseFloat(totalCommission) : agents[agentIndex].totalCommission,
      paidCommission: paidCommission !== undefined ? parseFloat(paidCommission) : agents[agentIndex].paidCommission
    };
    updatedAgent.pendingCommission = updatedAgent.totalCommission - updatedAgent.paidCommission;
    agents[agentIndex] = updatedAgent;
    console.log(`⚠️ DB disconnected - agent updated in memory: ${updatedAgent.name}`);
    return res.status(200).json({ success: true, message: 'Agent updated (memory)', agent: updatedAgent });
  } catch (error) {
    console.error('❌ Error updating agent:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// DELETE agent - NO AUTHENTICATION REQUIRED
app.delete('/api/agents/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ DELETE /api/agents/${id} called - NO AUTH`);

  if (mongoose.connection.readyState === 1) {
    try {
      const deleted = await Agent.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Agent not found' });
      }
      return res.status(200).json({ success: true, message: 'Agent deleted successfully (MongoDB)' });
    } catch (error) {
      console.error('❌ Error deleting agent:', error);
      return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  }

  // Fallback to in-memory
  const agentIndex = agents.findIndex(a => a.id === parseInt(id));
  if (agentIndex === -1) {
    return res.status(404).json({ success: false, message: 'Agent not found' });
  }
  const deletedAgent = agents[agentIndex];
  agents.splice(agentIndex, 1);
  console.log(`⚠️ DB disconnected - agent deleted from memory: ${deletedAgent.name}`);
  return res.status(200).json({ success: true, message: 'Agent deleted (memory)' });
});

// ==================== EMPLOYEES ROUTES ====================

// GET all employees - NO AUTHENTICATION REQUIRED
app.get('/api/employees', async (req, res) => {
  console.log('👥 GET /api/employees called - NO AUTH');

  if (mongoose.connection.readyState === 1) {
    try {
      const docs = await Employee.find({ isActive: true }).sort({ createdAt: -1 }).lean();
      console.log(`✅ Loaded ${docs.length} employees from MongoDB`);
      return res.status(200).json(docs);
    } catch (error) {
      console.error('❌ Error fetching employees from MongoDB:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch employees: ' + error.message });
    }
  }

  // Fallback to in-memory
  console.log(`✅ Loaded ${employees.length} employees from memory (DB disconnected)`);
  return res.status(200).json(employees.filter(emp => emp.isActive));
});

// POST create new employee - NO AUTHENTICATION REQUIRED
app.post('/api/employees', async (req, res) => {
  console.log('📝 POST /api/employees called - NO AUTH');
  console.log('Request body:', req.body);

  try {
    const {
      employeeName,
      photo,
      role,
      department,
      salary,
      monthlyPerformance,
      phoneNumber,
      email,
      joiningDate,
      address
    } = req.body;

    // Validation
    if (!employeeName || !employeeName.trim()) {
      return res.status(400).json({ success: false, message: 'Employee name is required' });
    }

    if (mongoose.connection.readyState === 1) {
      const doc = await Employee.create({
        employeeName: employeeName.trim(),
        photo: photo || '',
        role: role?.trim() || '',
        department: department?.trim() || '',
        salary: salary ? parseFloat(salary) : 0,
        monthlyPerformance: monthlyPerformance ? parseInt(monthlyPerformance) : null,
        phoneNumber: phoneNumber?.trim() || '',
        email: email?.trim() || '',
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        address: address?.trim() || '',
        isActive: true
      });

      console.log(`✅ Employee created in MongoDB: ${doc.employeeName}`);
      return res.status(201).json(doc);
    }

    // Fallback to in-memory
    const newEmployee = {
      _id: '674350a1b2c3d4e5f6789' + Date.now().toString().slice(-3),
      employeeName: employeeName.trim(),
      photo: photo || '',
      role: role?.trim() || '',
      department: department?.trim() || '',
      salary: salary ? parseFloat(salary) : 0,
      monthlyPerformance: monthlyPerformance ? parseInt(monthlyPerformance) : null,
      phoneNumber: phoneNumber?.trim() || '',
      email: email?.trim() || '',
      joiningDate: joiningDate || '',
      address: address?.trim() || '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    employees.push(newEmployee);
    console.log(`⚠️ DB disconnected - employee created in memory: ${newEmployee.employeeName} (Total: ${employees.length})`);
    return res.status(201).json(newEmployee);
  } catch (error) {
    console.error('❌ Error creating employee:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// PUT update employee - NO AUTHENTICATION REQUIRED
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`✏️ PUT /api/employees/${id} called - NO AUTH`);
  console.log('Request body:', req.body);

  try {
    if (mongoose.connection.readyState === 1) {
      const updated = await Employee.findByIdAndUpdate(
        id,
        { ...req.body, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      console.log(`✅ Employee updated in MongoDB: ${updated.employeeName}`);
      return res.status(200).json(updated);
    }

    // Fallback to in-memory
    const employeeIndex = employees.findIndex(emp => emp._id === id);
    if (employeeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const updatedEmployee = {
      ...employees[employeeIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    employees[employeeIndex] = updatedEmployee;
    console.log(`⚠️ DB disconnected - employee updated in memory: ${updatedEmployee.employeeName}`);
    return res.status(200).json(updatedEmployee);
  } catch (error) {
    console.error('❌ Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// DELETE employee - NO AUTHENTICATION REQUIRED
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ DELETE /api/employees/${id} called - NO AUTH`);

  try {
    if (mongoose.connection.readyState === 1) {
      const deleted = await Employee.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      console.log(`✅ Employee soft deleted in MongoDB: ${deleted.employeeName}`);
      return res.status(200).json({ success: true, message: 'Employee deleted successfully' });
    }

    // Fallback to in-memory
    const employeeIndex = employees.findIndex(emp => emp._id === id);
    if (employeeIndex === -1) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    employees[employeeIndex].isActive = false;
    console.log(`⚠️ DB disconnected - employee soft deleted in memory: ${employees[employeeIndex].employeeName}`);
    return res.status(200).json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// GET top performing employees
app.get('/api/employees/top-performers', async (req, res) => {
  console.log('🏆 GET /api/employees/top-performers called - NO AUTH');

  try {
    if (mongoose.connection.readyState === 1) {
      const topPerformers = await Employee.find({ 
        isActive: true, 
        monthlyPerformance: { $gte: 4 } 
      })
      .sort({ monthlyPerformance: -1 })
      .limit(5)
      .lean();

      const result = topPerformers.map(emp => ({
        name: emp.employeeName,
        score: emp.monthlyPerformance,
        tasksCompleted: Math.floor(Math.random() * 20) + 10, // Mock data
        month: 'November 2025',
        department: emp.department,
        role: emp.role
      }));

      return res.json(result);
    }

    // Fallback - mock top performers from in-memory data
    const activeEmployees = employees.filter(emp => emp.isActive);
    const topPerformers = activeEmployees
      .filter(emp => emp.monthlyPerformance >= 4)
      .sort((a, b) => b.monthlyPerformance - a.monthlyPerformance)
      .slice(0, 5)
      .map(emp => ({
        name: emp.employeeName,
        score: emp.monthlyPerformance,
        tasksCompleted: Math.floor(Math.random() * 20) + 10,
        month: 'November 2025',
        department: emp.department,
        role: emp.role
      }));

    res.json(topPerformers);
  } catch (error) {
    console.error('❌ Error getting top performers:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST employee attendance (GPS check-in)
app.post('/api/employees/:id/attendance', async (req, res) => {
  const { id } = req.params;
  console.log(`📍 POST /api/employees/${id}/attendance called - NO AUTH`);
  console.log('Location data:', req.body);

  try {
    const { lat, lng, accuracy, deviceInfo, timestamp } = req.body;

    if (mongoose.connection.readyState === 1) {
      const attendance = await Attendance.create({
        employeeId: id,
        lat,
        lng,
        accuracy,
        deviceInfo,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });

      console.log(`✅ Attendance recorded in MongoDB for employee: ${id}`);
      return res.status(201).json({
        message: 'Check-in successful',
        attendance: {
          _id: attendance._id,
          employeeId: id,
          lat,
          lng,
          accuracy,
          timestamp: attendance.timestamp,
          checkInTime: attendance.checkInTime
        },
        lat,
        lng,
        accuracy,
        timestamp: attendance.timestamp
      });
    }

    // Fallback - just return success response
    const mockAttendance = {
      _id: 'att_' + Date.now(),
      employeeId: id,
      lat,
      lng,
      accuracy,
      timestamp: new Date().toISOString(),
      checkInTime: new Date().toISOString()
    };

    console.log(`⚠️ DB disconnected - attendance simulated for employee: ${id}`);
    return res.status(201).json({
      message: 'Check-in successful',
      attendance: mockAttendance,
      lat,
      lng,
      accuracy,
      timestamp: mockAttendance.timestamp
    });
  } catch (error) {
    console.error('❌ Error recording attendance:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// ==================== END EMPLOYEES ROUTES ====================

// ========================================
// REPORTS AND ANALYTICS API ROUTES
// ========================================

// GET advance transaction analytics summary
app.get('/api/reports/analytics', async (req, res) => {
  console.log('📊 GET /api/reports/analytics called - NO AUTH');
  try {
    const { startDate, endDate } = req.query;
    
    if (mongoose.connection.readyState === 1) {
      const analytics = await AdvanceTransaction.getAnalytics(startDate, endDate);
      const pendingConversions = await AdvanceTransaction.find({ 
        status: 'Pending',
        $or: [
          { transactionType: 'Advance In' },
          { transactionType: 'Advance Out' }
        ]
      }).lean();

      const summary = {
        totalAdvanceIn: analytics.totalAdvanceIn || 0,
        totalAdvanceOut: analytics.totalAdvanceOut || 0,
        netBalance: (analytics.totalAdvanceIn || 0) - (analytics.totalAdvanceOut || 0),
        pendingConversions: pendingConversions.length,
        totalTransactions: analytics.totalTransactions || 0
      };

      return res.json({ success: true, analytics: summary });
    }

    // Mock data for disconnected state
    const mockAnalytics = {
      totalAdvanceIn: 2450000,
      totalAdvanceOut: 1650000,
      netBalance: 800000,
      pendingConversions: 12,
      totalTransactions: 45
    };

    res.json({ success: true, analytics: mockAnalytics });
  } catch (error) {
    console.error('❌ Error getting analytics:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// GET daily analytics
app.get('/api/reports/daily', async (req, res) => {
  console.log('📊 GET /api/reports/daily called - NO AUTH');
  try {
    const { days = 30 } = req.query;
    
    if (mongoose.connection.readyState === 1) {
      const dailyData = await AdvanceTransaction.getDailyAnalytics(parseInt(days));
      return res.json({ success: true, dailyData });
    }

    // Mock daily data
    const mockDailyData = [];
    const today = new Date();
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      mockDailyData.push({
        _id: date.toISOString().split('T')[0],
        advanceIn: Math.floor(Math.random() * 100000) + 10000,
        advanceOut: Math.floor(Math.random() * 50000) + 5000,
        transactions: Math.floor(Math.random() * 5) + 1
      });
    }

    res.json({ success: true, dailyData: mockDailyData });
  } catch (error) {
    console.error('❌ Error getting daily analytics:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// GET monthly analytics
app.get('/api/reports/monthly', async (req, res) => {
  console.log('📊 GET /api/reports/monthly called - NO AUTH');
  try {
    const { months = 12 } = req.query;
    
    if (mongoose.connection.readyState === 1) {
      const monthlyData = await AdvanceTransaction.getMonthlyAnalytics(parseInt(months));
      
      // Transform the data to include month names
      const transformedData = monthlyData.map(item => ({
        month: new Date(item._id.year, item._id.month - 1).toLocaleString('default', { 
          month: 'long', 
          year: 'numeric' 
        }),
        advanceIn: item.advanceIn,
        advanceOut: item.advanceOut,
        transactions: item.transactions
      }));
      
      return res.json({ success: true, monthlyData: transformedData });
    }

    // Mock monthly data
    const mockMonthlyData = [];
    const today = new Date();
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      mockMonthlyData.push({
        month: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        advanceIn: Math.floor(Math.random() * 1000000) + 200000,
        advanceOut: Math.floor(Math.random() * 500000) + 100000,
        transactions: Math.floor(Math.random() * 50) + 10
      });
    }

    res.json({ success: true, monthlyData: mockMonthlyData });
  } catch (error) {
    console.error('❌ Error getting monthly analytics:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// GET pending conversions
app.get('/api/reports/pending-conversions', async (req, res) => {
  console.log('📊 GET /api/reports/pending-conversions called - NO AUTH');
  try {
    const { search, status, limit = 50 } = req.query;
    
    if (mongoose.connection.readyState === 1) {
      let query = { 
        status: 'Pending',
        $or: [
          { transactionType: 'Advance In' },
          { transactionType: 'Advance Out' }
        ]
      };

      if (search) {
        query.$and = [
          query.$or ? { $or: query.$or } : {},
          {
            $or: [
              { customerName: { $regex: search, $options: 'i' } },
              { plotNumber: { $regex: search, $options: 'i' } }
            ]
          }
        ];
        delete query.$or;
      }

      if (status && status !== 'all') {
        if (status === 'received') {
          query.transactionType = 'Advance In';
        } else if (status === 'given') {
          query.transactionType = 'Advance Out';
        }
      }

      const pendingConversions = await AdvanceTransaction.find(query)
        .limit(parseInt(limit))
        .sort({ transactionDate: -1 })
        .lean();

      return res.json({ success: true, pendingConversions });
    }

    // Mock pending conversions data
    const mockPendingConversions = [
      {
        _id: '674350a1b2c3d4e5f6789015',
        customerName: 'राजेश शर्मा',
        plotNumber: 'P-101',
        amount: 150000,
        transactionDate: '2024-10-15',
        transactionType: 'Advance In',
        category: 'Advance Received',
        daysWaiting: 18,
        expectedConversionDate: '2024-11-20',
        status: 'Pending'
      },
      {
        _id: '674350a1b2c3d4e5f6789016',
        customerName: 'सुनीता पाटील',
        plotNumber: 'P-205',
        amount: 75000,
        transactionDate: '2024-10-20',
        transactionType: 'Advance Out',
        category: 'Advance Given',
        daysWaiting: 13,
        expectedConversionDate: '2024-11-25',
        status: 'Pending'
      },
      {
        _id: '674350a1b2c3d4e5f6789017',
        customerName: 'अमित कुमार',
        plotNumber: 'P-303',
        amount: 200000,
        transactionDate: '2024-10-01',
        transactionType: 'Advance In',
        category: 'Advance Received',
        daysWaiting: 32,
        expectedConversionDate: '2024-11-15',
        status: 'Pending'
      }
    ];

    // Apply search filter to mock data
    let filteredData = mockPendingConversions;
    if (search) {
      filteredData = mockPendingConversions.filter(item => 
        item.customerName.toLowerCase().includes(search.toLowerCase()) ||
        item.plotNumber.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status && status !== 'all') {
      if (status === 'received') {
        filteredData = filteredData.filter(item => item.transactionType === 'Advance In');
      } else if (status === 'given') {
        filteredData = filteredData.filter(item => item.transactionType === 'Advance Out');
      }
    }

    res.json({ success: true, pendingConversions: filteredData });
  } catch (error) {
    console.error('❌ Error getting pending conversions:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// POST create advance transaction
app.post('/api/advance-transactions', async (req, res) => {
  console.log('📝 POST /api/advance-transactions called - NO AUTH');
  try {
    const transactionData = {
      ...req.body,
      transactionId: `ADV-${Date.now()}`,
      transactionDate: req.body.transactionDate || new Date()
    };

    if (mongoose.connection.readyState === 1) {
      const transaction = new AdvanceTransaction(transactionData);
      await transaction.save();
      console.log(`✅ Advance transaction created: ${transaction.transactionId}`);
      return res.status(201).json({ success: true, transaction });
    }

    // Mock response for disconnected state
    const mockTransaction = {
      _id: `674350a1b2c3d4e5f6789${Date.now().toString().slice(-3)}`,
      ...transactionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log(`⚠️ DB disconnected - transaction created in memory: ${mockTransaction.transactionId}`);
    res.status(201).json({ success: true, transaction: mockTransaction });
  } catch (error) {
    console.error('❌ Error creating advance transaction:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// PUT convert pending transaction to sale
app.put('/api/advance-transactions/:id/convert', async (req, res) => {
  console.log(`📊 PUT /api/advance-transactions/${req.params.id}/convert called - NO AUTH`);
  try {
    const { id } = req.params;
    const { saleAmount, plotId, notes } = req.body;

    if (mongoose.connection.readyState === 1) {
      const transaction = await AdvanceTransaction.findById(id);
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      transaction.status = 'Converted';
      transaction.isConverted = true;
      transaction.convertedDate = new Date();
      transaction.convertedToSaleId = plotId;
      if (notes) transaction.notes = notes;

      await transaction.save();
      console.log(`✅ Transaction converted: ${transaction.transactionId}`);
      return res.json({ success: true, message: 'Transaction converted to sale', transaction });
    }

    // Mock response for disconnected state
    console.log(`⚠️ DB disconnected - transaction conversion simulated: ${id}`);
    res.json({ success: true, message: 'Transaction converted to sale (memory)' });
  } catch (error) {
    console.error('❌ Error converting transaction:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`,
    availableRoutes: [
      'GET /api/test',
      'GET /api/plots',
      'POST /api/plots',
      'PUT /api/plots/:id',
      'DELETE /api/plots/:id',
      'GET /api/agents',
      'GET /api/agents/:id',
      'POST /api/agents',
      'PUT /api/agents/:id',
      'DELETE /api/agents/:id',
      'GET /api/employees',
      'POST /api/employees',
      'PUT /api/employees/:id',
      'DELETE /api/employees/:id',
      'GET /api/employees/top-performers',
      'POST /api/employees/:id/attendance',
      'GET /api/reminders',
      'GET /api/reminders/:id',
      'POST /api/reminders',
      'PUT /api/reminders/:id',
      'DELETE /api/reminders/:id',
      'GET /api/reminders/system/due',
      'POST /api/reminders/:id/mark-sent',
      'GET /api/reports/analytics',
      'GET /api/reports/daily',
      'GET /api/reports/monthly',
      'GET /api/reports/pending-conversions',
      'POST /api/advance-transactions',
      'PUT /api/advance-transactions/:id/convert',
      'GET /api/documents/clients',
      'POST /api/documents/clients',
      'GET /api/documents/clients/:id/documents',
      'POST /api/documents/clients/:id/documents',
      'GET /api/documents/documents/:id/view',
      'GET /api/documents/documents/:id/download',
      'DELETE /api/documents/documents/:id'
    ]
  });
});

app.listen(PORT, () => {
  console.log('🎯='.repeat(40));
  console.log('🎯 SOMANING KOLI - Property Suite Backend (NO-AUTH)');
  console.log('🎯='.repeat(40));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
  console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📊 Plots API: http://localhost:${PORT}/api/plots`);
  console.log(`👤 Agents API: http://localhost:${PORT}/api/agents`);
  console.log(`� Employees API: http://localhost:${PORT}/api/employees`);
  console.log(`🏆 Top Performers: http://localhost:${PORT}/api/employees/top-performers`);
  console.log(`📍 GPS Attendance: http://localhost:${PORT}/api/employees/:id/attendance`);
  console.log(`�🔔 Reminders API: http://localhost:${PORT}/api/reminders`);
  console.log(`📈 Reports API: http://localhost:${PORT}/api/reports`);
  console.log(`💰 Advance Transactions API: http://localhost:${PORT}/api/advance-transactions`);
  console.log(`💳 Payments API: http://localhost:${PORT}/api/payments`);
  console.log(`🔒 Document Vault API: http://localhost:${PORT}/api/documents`);
  console.log(`🏗️ Construction API: http://localhost:${PORT}/api/construction`);
  console.log(`🏠 Development API: http://localhost:${PORT}/api/development`);
  console.log('🎯='.repeat(40));
  console.log('✅ NO AUTHENTICATION REQUIRED');
  console.log('✅ Using in-memory storage (data will persist until server restarts)');
  console.log('🎯='.repeat(40));
  
  // Start the reminder service
  reminderService.start();
  console.log('🔔 Reminder service started - Auto-reminder system active');
});
