const mongoose = require('mongoose');

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property_suite');
    
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
    
    // Create default admin user if not exists
    const User = require('../models/User');
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (!existingAdmin) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin@123', 10);
      
      await User.create({
        username: 'admin',
        password: hashedPassword,
        name: 'Somaning Pirappa Koli',
        role: 'Admin',
        mobile: '8421203314',
        isActive: true
      });
      
      console.log(' Default admin user created');
      console.log('   Username: admin');
      console.log('   Password: admin@123');
    } else {
      console.log('Admin user already exists');
    }
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;