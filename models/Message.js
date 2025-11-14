const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['formal', 'emotional', 'professional'],
    trim: true
  },
  festival: {
    type: String,
    enum: ['diwali', 'gudipadwa', 'shravan', 'custom'],
    trim: true
  },
  recipients: [{
    phone: String,
    name: String,
    sent: { type: Boolean, default: false },
    sentAt: Date,
    error: String
  }],
  sentCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'scheduled'],
    default: 'draft'
  },
  scheduledDate: {
    type: Date
  },
  sentDate: {
    type: Date
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
messageSchema.index({ status: 1 });
messageSchema.index({ createdBy: 1 });
messageSchema.index({ scheduledDate: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);