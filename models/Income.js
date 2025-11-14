const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  paymentStatus: {
    type: String,
    enum: ['Received', 'Pending', 'Partial'],
    default: 'Pending'
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Site information
  site: {
    type: String,
    required: [true, 'Site information is required'],
    default: 'Main Site'
  },
  
  // Contract details
  contractValue: {
    type: Number,
    min: [0, 'Contract value must be positive']
  },
  advanceReceived: {
    type: Number,
    min: [0, 'Advance amount must be positive'],
    default: 0
  },
  balanceAmount: {
    type: Number,
    min: [0, 'Balance amount must be positive']
  },
  
  // Payment method
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card', 'Other'],
    default: 'Cash'
  },
  
  // Customer contact information
  customerPhone: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  customerEmail: {
    type: String,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  customerAddress: {
    type: String,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  
  // Project details
  projectType: {
    type: String,
    enum: ['Residential', 'Commercial', 'Industrial', 'Infrastructure', 'Other'],
    default: 'Residential'
  },
  startDate: {
    type: Date
  },
  expectedCompletionDate: {
    type: Date
  },
  actualCompletionDate: {
    type: Date
  },
  
  // Invoice information
  invoiceNumber: {
    type: String,
    unique: true
  },
  invoiceDate: {
    type: Date
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

// Auto-generate invoice number
incomeSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    const timestamp = Date.now().toString().slice(-6);
    this.invoiceNumber = `INV-${this.projectType.charAt(0)}${timestamp}`;
  }
  
  // Calculate balance amount if not provided
  if (this.contractValue && !this.balanceAmount) {
    this.balanceAmount = this.contractValue - (this.advanceReceived || 0);
  }
  
  next();
});

// Indexes for better query performance
incomeSchema.index({ site: 1, date: -1 });
incomeSchema.index({ customerName: 1 });
incomeSchema.index({ paymentStatus: 1 });
incomeSchema.index({ createdAt: -1 });

// Check if model is already compiled to prevent OverwriteModelError
const Income = mongoose.models.Income || mongoose.model('Income', incomeSchema);
module.exports = Income;