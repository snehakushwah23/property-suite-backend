const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    match: [/^\d{10}$/, 'Mobile number must be 10 digits']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  documentsCount: {
    type: Number,
    default: 0
  },
  lastDocumentUpload: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster searches
clientSchema.index({ name: 'text', mobile: 1 });
clientSchema.index({ mobile: 1 });
clientSchema.index({ createdAt: -1 });

// Virtual for client ID display
clientSchema.virtual('displayId').get(function() {
  return 'CLT' + this._id.toString().slice(-6).toUpperCase();
});

// Ensure virtual fields are serialized
clientSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Client', clientSchema);