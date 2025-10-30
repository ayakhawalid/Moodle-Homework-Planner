const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://aia-user1:aia@cluster0.y9gor0a.mongodb.net/plannerDB';
    // Basic visibility into which URI form is being used (mask credentials)
    const masked = uri.replace(/:\/\/([^:@]+):([^@]+)@/,'://$1:****@');
    console.log(`🗄️  Connecting to MongoDB at: ${masked}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
    });

    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`);
    
    // Log database name
    console.log(`Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    console.error('Ensure MONGODB_URI is set correctly and the cluster is reachable.');
    process.exit(1);
  }
};

module.exports = connectDB;
