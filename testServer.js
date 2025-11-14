const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Simple test server to check Employee API
const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property-suite')
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => {
    console.log('❌ MongoDB connection failed:', err.message);
  });

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date() });
});

// Employee routes
app.use('/api/employees', require('./routes/employees'));

// Test the employee endpoint specifically
app.get('/test-employees', async (req, res) => {
  try {
    const Employee = require('./models/Employee');
    const count = await Employee.countDocuments();
    res.json({ 
      message: 'Employee endpoint test',
      employeeCount: count,
      status: 'OK'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001; // Different port to avoid conflicts

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📝 Test employee API: http://localhost:${PORT}/api/employees`);
  console.log(`🧪 Server test: http://localhost:${PORT}/test`);
  console.log(`👥 Employee count test: http://localhost:${PORT}/test-employees`);
});