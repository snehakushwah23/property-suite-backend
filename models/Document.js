const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: [
      'aadhaar',
      'pan',
      'seven_twelve',
      'layout_map', 
      'property_card',
      'agreement',
      'passport',
      'driving_license',
      'voter_id',
      'bank_statement',
      'income_proof',
      'other'
    ],
    default: 'other'
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  cloudBackup: {
    type: Boolean,
    default: false
  },
  cloudUrl: {
    type: String
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    maxlength: 250
  },
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  previousVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  accessHistory: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['view', 'download', 'upload', 'delete', 'share']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
documentSchema.index({ clientId: 1, documentType: 1 });
documentSchema.index({ uploadDate: -1 });
documentSchema.index({ documentType: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ isActive: 1 });

// Virtual for document display ID
documentSchema.virtual('displayId').get(function() {
  return 'DOC' + this._id.toString().slice(-6).toUpperCase();
});

// Virtual for file extension
documentSchema.virtual('fileExtension').get(function() {
  return this.fileName.split('.').pop().toUpperCase();
});

// Method to add access history
documentSchema.methods.addAccessHistory = function(userId, action, ipAddress) {
  this.accessHistory.push({
    userId,
    action,
    ipAddress,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to get documents by type
documentSchema.statics.getByType = function(clientId, documentType) {
  return this.find({ 
    clientId, 
    documentType, 
    isActive: true 
  }).sort({ uploadDate: -1 });
};

// Static method to get recent documents
documentSchema.statics.getRecent = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ uploadDate: -1 })
    .limit(limit)
    .populate('clientId', 'name mobile')
    .populate('uploadedBy', 'name email');
};

// Pre-save middleware to update version
documentSchema.pre('save', function(next) {
  if (this.isNew && this.previousVersionId) {
    this.version = 1;
    // Find the previous version and increment
    this.constructor.findById(this.previousVersionId)
      .then(prevDoc => {
        if (prevDoc) {
          this.version = (prevDoc.version || 1) + 1;
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

// Pre-remove middleware to handle file cleanup
documentSchema.pre('remove', async function(next) {
  const fs = require('fs').promises;
  try {
    // Delete physical file if exists
    await fs.unlink(this.filePath);
  } catch (error) {
    console.log('File not found or already deleted:', this.filePath);
  }
  next();
});

// Ensure virtual fields are serialized
documentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);