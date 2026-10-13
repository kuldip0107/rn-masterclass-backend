const mongoose = require('mongoose');

// Prevent Mongoose from buffering queries indefinitely when offline
mongoose.set('bufferTimeoutMS', 2500);

let retryTimer = null;

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes('<db_password>') || mongoUri.includes('<password>') || mongoUri.includes('<username>')) {
    console.warn('⚠️ Warning: Please configure your actual MongoDB Atlas connection string in the .env file.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.warn('⚠️ Server is running. If using MongoDB Atlas, make sure 0.0.0.0/0 is added to Atlas Network Access.');
    if (!retryTimer) {
      retryTimer = setInterval(() => {
        if (mongoose.connection.readyState !== 1) {
          connectDB();
        }
      }, 15000);
    }
  }
};

module.exports = connectDB;
