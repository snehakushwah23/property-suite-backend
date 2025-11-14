const mongoose = require('mongoose');

const gstBillSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  plotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plot'
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true
  },
  customerGstin: {
    type: String,
    trim: true,
    uppercase: true
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  gstRate: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  gstAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  billDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'GPay', 'PhonePe', 'Bank Transfer', 'Cheque'],
    trim: true
  },
  paymentDate: {
    type: Date
  },
  billPath: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
gstBillSchema.index({ billNumber: 1 });
gstBillSchema.index({ status: 1 });
gstBillSchema.index({ billDate: -1 });
gstBillSchema.index({ createdBy: 1 });

// Calculate GST amount before saving
gstBillSchema.pre('save', function(next) {
  this.gstAmount = (this.baseAmount * this.gstRate) / 100;
  this.totalAmount = this.baseAmount + this.gstAmount;
  next();
});

module.exports = mongoose.models.GSTBill || mongoose.model('GSTBill', gstBillSchema);