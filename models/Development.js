const mongoose = require('mongoose');

const developmentExpenseSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true
  },
  siteName: {
    type: String,
    required: true
  },
  expenseType: {
    type: String,
    required: true,
    enum: ['jcb', 'diesel', 'labor', 'material']
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  workType: {
    type: String,
    required: true
  },
  // JCB specific fields
  jcbDetails: {
    hours: Number,
    ratePerHour: Number,
    operatorName: String,
    workArea: String
  },
  // Diesel specific fields
  dieselDetails: {
    liters: Number,
    pricePerLiter: Number,
    vehicleNumber: String,
    purpose: String
  },
  // Labor specific fields
  laborDetails: {
    laborerName: String,
    days: Number,
    ratePerDay: Number,
    workType: String,
    overtimeHours: Number,
    overtimeRate: Number
  },
  // Material specific fields
  materialDetails: {
    materialType: String,
    quantity: Number,
    unit: String,
    supplier: String,
    billNumber: String,
    transportCost: Number
  },
  addedBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const developmentIncomeSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true
  },
  siteName: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  addedBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const developmentSiteSchema = new mongoose.Schema({
  siteId: {
    type: String,
    unique: true,
    required: true
  },
  siteName: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  area: {
    type: String, // e.g., "10 acres", "5000 sq ft"
    required: true
  },
  projectType: {
    type: String,
    required: true,
    enum: ['residential', 'commercial', 'mixed', 'industrial']
  },
  status: {
    type: String,
    required: true,
    enum: ['planning', 'ongoing', 'completed', 'on-hold'],
    default: 'planning'
  },
  startDate: {
    type: Date,
    required: true
  },
  expectedEndDate: {
    type: Date,
    required: true
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
developmentExpenseSchema.index({ siteId: 1, date: -1 });
developmentExpenseSchema.index({ expenseType: 1 });
developmentIncomeSchema.index({ siteId: 1, date: -1 });
developmentSiteSchema.index({ siteId: 1 });
developmentSiteSchema.index({ status: 1 });

const DevelopmentExpense = mongoose.model('DevelopmentExpense', developmentExpenseSchema);
const DevelopmentIncome = mongoose.model('DevelopmentIncome', developmentIncomeSchema);
const DevelopmentSite = mongoose.model('DevelopmentSite', developmentSiteSchema);

module.exports = { DevelopmentExpense, DevelopmentIncome, DevelopmentSite };