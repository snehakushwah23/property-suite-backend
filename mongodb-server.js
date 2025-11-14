const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting MongoDB-enabled server...');

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
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route for connectivity check
app.get('/api/test', (req, res) => {
  console.log('📡 Test endpoint called');
  res.json({ 
    message: 'MongoDB Backend server is working!', 
    timestamp: new Date().toISOString(),
    status: 'OK',
    server: 'MongoDB-enabled Backend'
  });
});

// GET all plots
app.get('/api/plots', async (req, res) => {
  console.log('📊 GET /api/plots called');
  
  try {
    const plots = await Plot.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      message: `Loaded ${plots.length} plots from MongoDB`,
      plots: plots
    });
    
  } catch (error) {
    console.error('MongoDB GET error:', error);
    // Fallback to mock data
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
          buyerPhoto: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNEY0NkU1IiByeD0iNCIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlI8L3RleHQ+Cjwvc3ZnPgo=',
          buyerSignature: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMDU5NjY5IiByeD0iNCIvPgo8dGV4dCB4PSIxNiIgeT0iMjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKckzwvdGV4dD4KPC9zdmc+Cg==',
          createdAt: '2024-10-15T10:00:00.000Z'
        }
      ]
    });
  }
});

// POST - Add new plot
app.post('/api/plots', async (req, res) => {
  console.log('📝 POST /api/plots called');
  console.log('Request body:', req.body);
  
  try {
    // Calculate profit
    const purchasePrice = parseFloat(req.body.purchasePrice) || 0;
    const salePrice = parseFloat(req.body.salePrice) || 0;
    const profit = salePrice > 0 ? salePrice - purchasePrice : 0;
    
    const plotData = {
      ...req.body,
      purchasePrice,
      salePrice,
      profit
    };
    
    // Try to save to MongoDB
    const newPlot = new Plot(plotData);
    const savedPlot = await newPlot.save();
    
    console.log('✅ Plot saved to MongoDB:', savedPlot._id);
    
    res.json({
      success: true,
      message: 'Plot added to MongoDB successfully',
      plot: savedPlot
    });
    
  } catch (error) {
    console.error('❌ MongoDB save error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Plot number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to save plot: ' + error.message
    });
  }
});

// PUT - Update plot
app.put('/api/plots/:id', async (req, res) => {
  console.log('✏️ PUT /api/plots/' + req.params.id + ' called');
  
  try {
    // Calculate profit
    const purchasePrice = parseFloat(req.body.purchasePrice) || 0;
    const salePrice = parseFloat(req.body.salePrice) || 0;
    const profit = salePrice > 0 ? salePrice - purchasePrice : 0;
    
    const plotData = {
      ...req.body,
      purchasePrice,
      salePrice,
      profit
    };
    
    // Try to update in MongoDB
    const updatedPlot = await Plot.findByIdAndUpdate(
      req.params.id,
      plotData,
      { new: true, runValidators: true }
    );
    
    if (!updatedPlot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }
    
    console.log('✅ Plot updated in MongoDB:', updatedPlot._id);
    
    res.json({
      success: true,
      message: 'Plot updated in MongoDB successfully',
      plot: updatedPlot
    });
    
  } catch (error) {
    console.error('❌ MongoDB update error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Plot number already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update plot: ' + error.message
    });
  }
});

// DELETE - Delete plot
app.delete('/api/plots/:id', async (req, res) => {
  console.log('🗑️ DELETE /api/plots/' + req.params.id + ' called');
  
  try {
    // Try to delete from MongoDB
    const deletedPlot = await Plot.findByIdAndDelete(req.params.id);
    
    if (!deletedPlot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }
    
    console.log('✅ Plot deleted from MongoDB:', deletedPlot._id);
    
    res.json({
      success: true,
      message: 'Plot deleted from MongoDB successfully',
      plot: deletedPlot
    });
    
  } catch (error) {
    console.error('❌ MongoDB delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete plot: ' + error.message
    });
  }
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
      'POST /api/plots',
      'PUT /api/plots/:id',
      'DELETE /api/plots/:id'
    ]
  });
});

app.listen(PORT, () => {
  console.log('🎯='.repeat(40));
  console.log('🎯 SOMANING KOLI - Property Suite Backend');
  console.log('🎯='.repeat(40));
  console.log(`✅ MongoDB Server running on port ${PORT}`);
  console.log(`🔗 Backend URL: http://localhost:${PORT}`);
  console.log(`📡 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📊 Plots API: http://localhost:${PORT}/api/plots`);
  console.log('🎯='.repeat(40));
  console.log('✅ MongoDB integration enabled');
  console.log('🎯='.repeat(40));
});