const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  checkInLat: {
    type: Number,
    required: true
  },
  checkInLng: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number,
    default: 0
  },
  deviceInfo: {
    type: String,
    default: ''
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkOutTime: {
    type: Date
  },
  workingHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'partial', 'late'],
    default: 'present'
  },
  notes: {
    type: String,
    trim: true
  },
  // Validation fields
  isValidLocation: {
    type: Boolean,
    default: true
  },
  locationName: {
    type: String,
    default: 'Unknown'
  }
}, {
  timestamps: true
});

// Indexes for performance
attendanceSchema.index({ employeeId: 1, checkInTime: -1 });
attendanceSchema.index({ checkInTime: -1 });
attendanceSchema.index({ status: 1 });

// Virtual for formatted check-in time
attendanceSchema.virtual('formattedCheckIn').get(function() {
  return this.checkInTime.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to calculate working hours
attendanceSchema.methods.calculateWorkingHours = function() {
  if (this.checkOutTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    this.workingHours = Math.round(diffMs / (1000 * 60 * 60) * 100) / 100; // Hours with 2 decimal places
  }
  return this.workingHours;
};

// Static method to get attendance summary for an employee
attendanceSchema.statics.getEmployeeAttendanceSummary = function(employeeId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return this.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        checkInTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
          }
        },
        lateDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
          }
        },
        totalWorkingHours: { $sum: '$workingHours' },
        avgWorkingHours: { $avg: '$workingHours' }
      }
    }
  ]);
};

// Static method to get monthly attendance report
attendanceSchema.statics.getMonthlyReport = function(month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return this.aggregate([
    {
      $match: {
        checkInTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$employeeId',
        employeeName: { $first: '$employeeName' },
        totalDays: { $sum: 1 },
        presentDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
          }
        },
        lateDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'late'] }, 1, 0]
          }
        },
        totalWorkingHours: { $sum: '$workingHours' },
        avgWorkingHours: { $avg: '$workingHours' }
      }
    },
    {
      $sort: { presentDays: -1, totalWorkingHours: -1 }
    }
  ]);
};

module.exports = mongoose.model('Attendance', attendanceSchema);