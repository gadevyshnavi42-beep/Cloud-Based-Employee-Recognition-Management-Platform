// Connects to MongoDB using Mongoose.
const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/employee_recognition';
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   Make sure MongoDB is running and MONGO_URI in .env is correct.');
    process.exit(1);
  }
};

module.exports = connectDB;
