const mongoose = require('mongoose');

const plotSchema = new mongoose.Schema({
  plotNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Buyer Information
  buyerName: {
    type: String,
    trim: true
  },
  buyerPhone: {
    type: String,
    trim: true
  },
  buyerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  buyerAddress: {
    type: String,
    trim: true
  },
  buyerPhoto: {
    type: String, // File path
    trim: true
  },
  buyerSignature: {
    type: String, // File path
    trim: true
  },
  
  // Seller Information
  sellerName: {
    type: String,
    required: true,
    trim: true
  },
  sellerPhone: {
    type: String,
    trim: true
  },
  sellerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  sellerAddress: {
    type: String,
    trim: true
  },
  sellerPhoto: {
    type: String, // File path
    trim: true
  },
  sellerSignature: {
    type: String, // File path
    trim: true
  },
  
  // Plot Details
  village: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  
  // Financial Information
  purchasePrice: {
    type: Number,
    required: true,
    min: 0
  },
  salePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  profitLoss: {
    type: Number,
    default: 0
  },
  
  // Payment Information
  paymentMode: {
    type: String,
    enum: ['Cash', 'GPay', 'PhonePe', 'Bank Transfer', 'Cheque'],
    trim: true
  },
  transactionDate: {
    type: Date,
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['Available', 'Sold', 'Reserved', 'Pending', 'Cancelled'],
    default: 'Available'
  },
  
  // GST Information
  gstApplicable: {
    type: Boolean,
    default: false
  },
  gstAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Memo Information
  memoGenerated: {
    type: Boolean,
    default: false
  },
  memoPath: {
    type: String,
    trim: true
  },
  
  // Agent Reference
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  
  // Created By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Additional Documents
  documents: [{
    name: String,
    path: String,
    type: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
plotSchema.index({ plotNumber: 1 });
plotSchema.index({ status: 1 });
plotSchema.index({ village: 1 });
plotSchema.index({ createdBy: 1 });
plotSchema.index({ agentId: 1 });
plotSchema.index({ transactionDate: -1 });

// Calculate profit/loss before saving
plotSchema.pre('save', function(next) {
  if (this.salePrice && this.purchasePrice) {
    this.profitLoss = this.salePrice - this.purchasePrice;
  }
  next();
});

// Check if model is already compiled to prevent OverwriteModelError
module.exports = mongoose.models.Plot || mongoose.model('Plot', plotSchema);