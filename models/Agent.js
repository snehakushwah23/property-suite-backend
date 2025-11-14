const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    trim: true
  },
  bankAccount: {
    type: String,
    trim: true
  },
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  commissionRate: {
    type: Number,
    default: 2.5,
    min: 0,
    max: 100
  },
  photo: {
    type: String, // File path
    trim: true
  },
  signature: {
    type: String, // File path
    trim: true
  },
  totalCommission: {
    type: Number,
    default: 0,
    min: 0
  },
  paidCommission: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingCommission: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
agentSchema.index({ phone: 1 });
agentSchema.index({ isActive: 1 });
agentSchema.index({ name: 1 });

// Calculate pending commission before saving
agentSchema.pre('save', function(next) {
  this.pendingCommission = this.totalCommission - this.paidCommission;
  next();
});

module.exports = mongoose.models.Agent || mongoose.model('Agent', agentSchema);