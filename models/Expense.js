const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Expense category is required'],
    enum: ['material', 'labor', 'contractor', 'engineer', 'other']
  },
  // Material Purchase fields
  itemName: {
    type: String,
    required: function() { return this.category === 'material'; }
  },
  quantity: {
    type: String,
    required: function() { return this.category === 'material'; }
  },
  rate: {
    type: Number,
    required: function() { return this.category === 'material'; }
  },
  supplier: {
    type: String,
    required: function() { return this.category === 'material'; }
  },
  
  // Labor Salary fields
  workerName: {
    type: String,
    required: function() { return this.category === 'labor'; }
  },
  days: {
    type: Number,
    required: function() { return this.category === 'labor'; }
  },
  dailyWage: {
    type: Number,
    required: function() { return this.category === 'labor'; }
  },
  workType: {
    type: String,
    enum: ['Mason', 'Helper', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'General Labor'],
    required: function() { return this.category === 'labor'; }
  },
  
  // Contractor Bill fields
  contractorName: {
    type: String,
    required: function() { return this.category === 'contractor'; }
  },
  workDetails: {
    type: String,
    required: function() { return this.category === 'contractor'; }
  },
  
  // Engineer Bill fields
  engineerName: {
    type: String,
    required: function() { return this.category === 'engineer'; }
  },
  serviceType: {
    type: String,
    enum: ['Site Engineer', 'Supervisor', 'Structural Engineer', 'Architect', 'Consultant'],
    required: function() { return this.category === 'engineer'; }
  },
  period: {
    type: String,
    required: function() { return this.category === 'engineer'; }
  },
  
  // Other Expenses fields
  expenseType: {
    type: String,
    enum: ['Transport', 'Food', 'Office Supplies', 'Utilities', 'Equipment Rental', 'Safety Equipment', 'Miscellaneous'],
    required: function() { return this.category === 'other'; }
  },
  description: {
    type: String,
    required: function() { return this.category === 'other' || this.category === 'contractor'; }
  },
  vendor: {
    type: String,
    required: function() { return this.category === 'other'; }
  },
  
  // Common fields for all categories
  amount: {
    type: Number,
    required: function() { return this.category !== 'material'; }
  },
  totalAmount: {
    type: Number,
    required: function() { return this.category === 'material' || this.category === 'labor'; }
  },
  billNumber: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial'],
    default: 'Pending',
    required: function() { return this.category === 'contractor' || this.category === 'engineer'; }
  },
  
  // Site information
  site: {
    type: String,
    required: [true, 'Site information is required'],
    default: 'Main Site'
  },
  
  // Created by user reference
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Additional notes
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ site: 1, date: -1 });
expenseSchema.index({ createdAt: -1 });

// Calculate total amount for material and labor categories
expenseSchema.pre('save', function(next) {
  if (this.category === 'material' && this.quantity && this.rate) {
    // For material, parse quantity if it's a string like "100 bags"
    const numericQuantity = parseFloat(this.quantity.toString().match(/\d+/)?.[0]) || 0;
    this.totalAmount = numericQuantity * this.rate;
  } else if (this.category === 'labor' && this.days && this.dailyWage) {
    this.totalAmount = this.days * this.dailyWage;
  }
  next();
});

// Check if model is already compiled to prevent OverwriteModelError
const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
module.exports = Expense;