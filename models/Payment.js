const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  plotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plot',
    required: [true, 'Plot ID is required']
  },
  plotNumber: {
    type: String,
    required: [true, 'Plot number is required']
  },
  paymentType: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: ['Advance In', 'Advance Out', 'Advance Payment', 'Installment', 'Final Payment', 'Token Money', 'Registration Fee', 'Commission Payment', 'Plot Sale', 'Agent Commission', 'Payment Due', 'Document Collection', 'Follow Up', 'Other']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  date: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: false // Make optional since some payments might not have due dates
  },
  paymentMode: {
    type: String,
    required: [true, 'Payment mode is required'],
    enum: ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card', 'GPay', 'PhonePe', 'Other'],
    default: 'Cash'
  },
  status: {
    type: String,
    enum: ['Pending', 'Received', 'Partial', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required']
  },
  customerPhone: {
    type: String
  },
  receiptNumber: {
    type: String,
    unique: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-generate receipt number and create payment reminder
paymentSchema.pre('save', function(next) {
  if (!this.receiptNumber) {
    const timestamp = Date.now().toString().slice(-6);
    this.receiptNumber = `RCP-${this.paymentType.charAt(0)}${timestamp}`;
  }
  next();
});

// Create automatic payment reminder after payment is saved
paymentSchema.post('save', async function(payment) {
  try {
    // Only create reminders for advance payments with due dates
    if ((payment.paymentType === 'Advance In' || payment.paymentType === 'Advance Payment') && 
        payment.dueDate && payment.status !== 'Received') {
      
      console.log('💰 Creating auto reminder for advance payment:', payment.receiptNumber);
      
      const Reminder = require('./Reminder');
      
      // Calculate reminder date (2 days before due date)
      const reminderDate = new Date(payment.dueDate);
      reminderDate.setDate(reminderDate.getDate() - 2);
      
      // Don't create reminder if reminder date is in the past
      if (reminderDate > new Date()) {
        const reminderData = {
          title: `Payment Reminder - Plot ${payment.plotNumber}`,
          description: `Reminder: Payment of ₹${payment.amount.toLocaleString('en-IN')} is due on ${payment.dueDate.toLocaleDateString('en-IN')} for Plot ${payment.plotNumber}. Please make the payment to avoid any inconvenience.`,
          customerName: payment.customerName,
          customerPhone: payment.customerPhone,
          dueDate: reminderDate,
          transactionType: 'Payment Due',
          category: 'Payment',
          amount: payment.amount,
          plotId: payment.plotId,
          plotNumber: payment.plotNumber,
          paymentId: payment._id,
          autoReminder: true,
          reminderMethod: 'WhatsApp,SMS',
          status: 'Pending'
        };
        
        const reminder = new Reminder(reminderData);
        await reminder.save();
        
        console.log(`✅ Auto reminder created for ${payment.customerName} - Due: ${reminderDate.toLocaleDateString('en-IN')}`);
      } else {
        console.log('⚠️ Reminder date is in the past, skipping auto reminder creation');
      }
    }
  } catch (error) {
    console.error('❌ Error creating auto reminder for payment:', error);
  }
});

// Index for faster queries
paymentSchema.index({ plotId: 1, date: -1 });
paymentSchema.index({ status: 1, dueDate: 1 });

// Check if model is already compiled to prevent OverwriteModelError
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
module.exports = Payment;