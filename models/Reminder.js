const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  // Transaction Details
  transactionId: { 
    type: String, 
    required: true,
    unique: true 
  },
  transactionType: { 
    type: String, 
    required: true,
    enum: ['Advance In', 'Advance Out', 'Plot Sale', 'Agent Commission', 'Payment Due', 'Document Collection', 'Follow Up'],
    default: 'Follow Up'
  },
  
  // Basic Info (keeping existing fields for compatibility)
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Party Information (enhanced)
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    trim: true
  },
  
  // Transaction Amount and Details
  amount: { 
    type: Number, 
    default: 0 
  },
  currency: { 
    type: String, 
    default: 'INR' 
  },
  
  // Date Information (enhanced)
  transactionDate: { 
    type: Date,
    default: Date.now
  },
  dueDate: { 
    type: Date, 
    required: true 
  },
  reminderDate: {
    type: Date,
    required: true
  },
  reminderTime: {
    type: String,
    trim: true,
    default: '10:00'
  },
  
  // Type and Status (enhanced)
  type: {
    type: String,
    enum: ['payment', 'document', 'visit', 'follow_up', 'advance_in', 'advance_out'],
    default: 'follow_up'
  },
  status: {
    type: String,
    enum: ['Pending', 'Reminded', 'Completed', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  
  // Category for search filters
  category: {
    type: String,
    enum: ['इसारत घेतलेले', 'इसारत दिलेले', 'Plot Deal', 'Commission', 'Document', 'Follow Up', 'Other'],
    default: 'Other'
  },
  
  // Auto Reminder Settings
  autoReminder: {
    type: Boolean,
    default: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminderSentDate: {
    type: Date
  },
  
  // Relations
  plotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plot'
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  
  // Communication Status
  whatsappSent: {
    type: Boolean,
    default: false
  },
  smsSent: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  
  // Notification Results and Methods
  reminderMethod: {
    type: String,
    enum: ['WhatsApp', 'SMS', 'Email', 'WhatsApp,SMS', 'WhatsApp,Email', 'SMS,Email', 'All'],
    default: 'WhatsApp,SMS'
  },
  notificationResults: [{
    method: { type: String }, // 'whatsapp', 'sms', 'email'
    success: { type: Boolean },
    messageId: { type: String },
    sentAt: { type: Date, default: Date.now },
    error: { type: String },
    simulated: { type: Boolean, default: false }
  }],
  sentAt: {
    type: Date
  },
  
  // Document Links
  documents: [{
    type: { type: String }, // 'PDF', 'Receipt', 'Agreement'
    url: { type: String },
    generatedDate: { type: Date }
  }],
  
  // Digital Signature Data
  digitalSignature: {
    senderSignature: { type: String }, // base64 image
    receiverSignature: { type: String }, // base64 image
    signedDate: { type: Date },
    verificationCode: { type: String } // For QR code verification
  },
  
  // Additional fields
  notes: { 
    type: String 
  },
  tags: [{ 
    type: String 
  }],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Indexes for efficient searching
reminderSchema.index({ dueDate: 1 });
reminderSchema.index({ reminderDate: 1 });
reminderSchema.index({ status: 1 });
reminderSchema.index({ category: 1 });
reminderSchema.index({ transactionType: 1 });
reminderSchema.index({ type: 1 });
reminderSchema.index({ createdBy: 1 });
reminderSchema.index({ customerName: 'text', description: 'text', title: 'text' });

// Pre-save middleware to auto-calculate reminder date and verification code
reminderSchema.pre('save', function(next) {
  // Set transaction ID if not exists
  if (!this.transactionId) {
    this.transactionId = 'TXN' + Date.now().toString(36).toUpperCase();
  }
  
  // Auto-calculate reminder date (2 days before due date)
  if (this.dueDate && this.autoReminder && (!this.reminderDate || this.isModified('dueDate'))) {
    this.reminderDate = new Date(this.dueDate.getTime() - (2 * 24 * 60 * 60 * 1000));
  }
  
  // Generate verification code if not exists
  if (!this.digitalSignature.verificationCode) {
    this.digitalSignature.verificationCode = this.generateVerificationCode();
  }
  
  next();
});

// Instance method to generate verification code
reminderSchema.methods.generateVerificationCode = function() {
  return 'REM' + this.transactionId + Date.now().toString(36).toUpperCase();
};

// Instance method to check if reminder should be sent
reminderSchema.methods.shouldSendReminder = function() {
  const today = new Date();
  const reminderDate = new Date(this.reminderDate);
  
  return (
    this.autoReminder &&
    !this.reminderSent &&
    this.status === 'Pending' &&
    today >= reminderDate &&
    today < this.dueDate
  );
};

// Instance method to mark reminder as sent
reminderSchema.methods.markReminderSent = function() {
  this.reminderSent = true;
  this.reminderSentDate = new Date();
  this.status = 'Reminded';
  return this.save();
};

// Static method to find reminders due for sending
reminderSchema.statics.findDueReminders = function() {
  const today = new Date();
  return this.find({
    autoReminder: true,
    reminderSent: false,
    status: 'Pending',
    reminderDate: { $lte: today },
    dueDate: { $gt: today }
  });
};

// Static method to find overdue reminders
reminderSchema.statics.findOverdueReminders = function() {
  const today = new Date();
  return this.find({
    status: { $in: ['Pending', 'Reminded'] },
    dueDate: { $lt: today }
  });
};

module.exports = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);