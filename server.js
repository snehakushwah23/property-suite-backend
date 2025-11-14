const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const connectDB = require('./database/mongodb');
require('dotenv').config();

// Connect to MongoDB
connectDB();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Test route for connectivity check
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend server is working!', 
    timestamp: new Date().toISOString(),
    status: 'OK',
    server: 'MongoDB Backend'
  });
});

// Test construction API specifically
app.get('/api/construction/test', (req, res) => {
  res.json({
    message: 'Construction API is working!',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

app.post('/api/construction/test', (req, res) => {
  console.log('Construction test POST received:', req.body);
  res.json({
    message: 'Construction POST API is working!',
    receivedData: req.body,
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// Test plots route without authentication for development
app.get('/api/plots/test', async (req, res) => {
  try {
    const Plot = require('./models/Plot');
    const plots = await Plot.find().limit(10);
    
    res.json({
      success: true,
      message: 'Test data from MongoDB',
      count: plots.length,
      plots: plots
    });
  } catch (error) {
    console.error('Error fetching test plots:', error);
    res.json({
      success: true,
      message: 'Mock data (MongoDB not available)',
      plots: [
        {
          _id: '674350a1b2c3d4e5f6789012',
          plotNumber: 'P-001',
          buyerName: 'Rahul Patil',
          sellerName: 'Suresh Kumar',
          village: 'Jat',
          area: '1200 sq.ft',
          location: 'Near School',
          purchasePrice: 180000,
          salePrice: 250000,
          profit: 70000,
          paymentMode: 'GPay',
          date: '2024-10-15',
          status: 'Sold',
          buyerPhoto: '/uploads/buyerPhoto/sample-photo-1.jpg',
          buyerSignature: '/uploads/buyerSignature/sample-signature-1.jpg'
        }
      ]
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/plots', require('./routes/plots'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/gst', require('./routes/gst'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/employees', require('./routes/employees'));

// Check if construction routes file exists before requiring
try {
  app.use('/api/construction', require('./routes/construction'));
  console.log('✅ Construction routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading construction routes:', error.message);
}

// Check if development routes file exists before requiring
try {
  app.use('/api/development', require('./routes/development'));
  console.log('✅ Development routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading development routes:', error.message);
}

// Check if document vault routes file exists before requiring
try {
  app.use('/api/documents', require('./routes/documents'));
  console.log('✅ Document vault routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading document vault routes:', error.message);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'PropertySuite Backend API is running',
    company: process.env.COMPANY_NAME,
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
🏢 PropertySuite Backend API Server Started
📍 Company: ${process.env.COMPANY_NAME || 'SOMANING KOLI'}
🌐 Server running on port ${PORT}
🔗 Health check: http://localhost:${PORT}/api/health
📝 Environment: ${process.env.NODE_ENV || 'development'}
  `);

  // Start the auto-reminder service
  console.log('🔔 Starting Auto-Reminder Service...');
  const reminderService = require('./services/reminderService');
  reminderService.start();

  // Log notification service configuration
  const notificationService = require('./services/notificationService');
  const config = notificationService.getConfig();
  console.log('📱 Notification Service Configuration:');
  console.log(`   WhatsApp: ${config.whatsapp.enabled ? '✅ Enabled' : '❌ Disabled'} (${config.whatsapp.configured ? 'Configured' : 'Not Configured'})`);
  console.log(`   SMS: ${config.sms.enabled ? '✅ Enabled' : '❌ Disabled'} (${config.sms.configured ? 'Configured' : 'Not Configured'})`);
  if (config.sms.senderId) {
    console.log(`   SMS Sender ID: ${config.sms.senderId}`);
  }
  
  console.log('📤 Test APIs available:');
  console.log(`   POST http://localhost:${PORT}/api/notifications/test`);
  console.log(`   POST http://localhost:${PORT}/api/notifications/check-due`);
  console.log(`   GET  http://localhost:${PORT}/api/notifications/config`);
  console.log('');
});

module.exports = app;