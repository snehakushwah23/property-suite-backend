const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting server with MongoDB support...');

// MongoDB Connection (simplified, no auth required)
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property_suite');
    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.log('⚠️  MongoDB connection failed, using mock data:', error.message);
  }
};

// Plot Schema
const plotSchema = new mongoose.Schema({
  plotNumber: { type: String, required: true, unique: true },
  buyerName: { type: String, required: true },
  sellerName: { type: String, required: true },
  village: { type: String, required: true },
  area: { type: String, required: true },
  location: { type: String, required: true },
  purchasePrice: { type: Number, required: true },
  salePrice: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  paymentMode: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['Available', 'Sold', 'Pending'], default: 'Available' },
  buyerPhoto: { type: String },
  buyerSignature: { type: String }
}, { timestamps: true });

const Plot = mongoose.model('Plot', plotSchema);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

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
  console.log('📡 Test endpoint called');
  res.json({ 
    message: 'Backend server is working!', 
    timestamp: new Date().toISOString(),
    status: 'OK',
    server: 'Express Backend (No MongoDB)'
  });
});

// Mock plots endpoint without authentication
app.get('/api/plots', (req, res) => {
  console.log('📊 Plots endpoint called (mock data)');
  res.json({
    success: true,
    message: 'Mock data from Express server',
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
      },
      {
        _id: '674350a1b2c3d4e5f6789013',
        plotNumber: 'P-002',
        buyerName: 'Priya Sharma',
        sellerName: 'Amit Desai',
        village: 'Karad',
        area: '1500 sq.ft',
        location: 'Main Road',
        purchasePrice: 220000,
        salePrice: 0,
        profit: 0,
        paymentMode: 'Cash',
        date: '2024-10-20',
        status: 'Available',
        buyerPhoto: null,
        buyerSignature: null
      }
    ]
  });
});

// Mock POST route for adding plots
app.post('/api/plots', (req, res) => {
  console.log('📝 Add plot endpoint called (mock)');
  console.log('Request body:', req.body);
  
  res.json({
    success: true,
    message: 'Plot added successfully (mock)',
    plot: {
      _id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`,
    availableRoutes: [
      'GET /api/test',
      'GET /api/plots',
      'POST /api/plots'
    ]
  });
});

app.listen(PORT, () => {
  console.log('🎯='.repeat(40));
  console.log('🎯 SOMANING KOLI - Property Suite Backend');
  console.log('🎯='.repeat(40));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
  console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📊 Plots API: http://localhost:${PORT}/api/plots`);
  console.log('🎯='.repeat(40));
  console.log('⚠️  Running without MongoDB (mock data only)');
  console.log('🎯='.repeat(40));
});