require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  console.log('Testing connection to MongoDB Atlas...');
  console.log('URI:', uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'Not defined');

  if (!uri || uri.includes('<username>') || uri.includes('<password>') || uri.includes('<db_password>') || uri.includes('YOUR_PASSWORD')) {
    console.error('❌ Error: .env file ma tamari sachi MongoDB Atlas connection string nakhvi padshe.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log('🎉 Safal! MongoDB Atlas sathe connect thai gayu chhe:');
    console.log(`Database Host: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    await mongoose.disconnect();
    console.log('Connection bandh kari didhu.');
  } catch (error) {
    console.error('❌ Connection fail thayu:', error.message);
  }
}

testConnection();
