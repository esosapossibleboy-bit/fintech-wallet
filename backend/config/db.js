const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true, // Forces MongoDB to build unique indexes on launch
    });
    console.log(`🚀 [DB Connected] Host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ [DB Error] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
