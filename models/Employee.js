const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  photo: {
    type: String,  // Base64 encoded image or URL
    default: ''
  },
  role: {
    type: String,
    enum: ['Manager', 'Sales Executive', 'Marketing Executive', 'Accountant', 'Admin', 'Field Agent', 'Customer Support'],
    default: 'Field Agent'
  },
  department: {
    type: String,
    enum: ['Sales', 'Marketing', 'Finance', 'Operations', 'HR', 'IT'],
    default: 'Sales'
  },
  salary: {
    type: Number,
    min: 0,
    default: 0
  },
  monthlyPerformance: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  address: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional fields for tracking
  totalSalesTarget: {
    type: Number,
    default: 0
  },
  totalSalesAchieved: {
    type: Number,
    default: 0
  },
  lastCheckIn: {
    lat: Number,
    lng: Number,
    timestamp: Date,
    accuracy: Number,
    deviceInfo: String
  }
}, {
  timestamps: true
});

// Indexes for performance
employeeSchema.index({ employeeName: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ monthlyPerformance: -1 });

// Virtual for performance percentage
employeeSchema.virtual('performancePercentage').get(function() {
  return (this.monthlyPerformance / 5) * 100;
});

// Virtual for sales achievement percentage
employeeSchema.virtual('salesAchievementPercentage').get(function() {
  if (this.totalSalesTarget === 0) return 0;
  return (this.totalSalesAchieved / this.totalSalesTarget) * 100;
});

// Method to update last check-in
employeeSchema.methods.updateCheckIn = function(lat, lng, accuracy, deviceInfo) {
  this.lastCheckIn = {
    lat,
    lng,
    timestamp: new Date(),
    accuracy,
    deviceInfo
  };
  return this.save();
};

// Static method to get top performers
employeeSchema.statics.getTopPerformers = function(limit = 10, month = null) {
  const query = { isActive: true };
  
  return this.find(query)
    .sort({ 
      monthlyPerformance: -1, 
      totalSalesAchieved: -1,
      employeeName: 1 
    })
    .limit(limit)
    .select('employeeName photo role department monthlyPerformance totalSalesAchieved totalSalesTarget');
};

module.exports = mongoose.model('Employee', employeeSchema);