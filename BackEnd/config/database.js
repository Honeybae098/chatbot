import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/camtecher-chatbot';

const connectDB = async () => {
  try {
    // Set up MongoDB connection options
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    await mongoose.connect(MONGO_URI, options);
    console.log('✅ MongoDB Connected Successfully!');
    
    // Log connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB Disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB Reconnected!');
    });
    
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    // Don't exit - allow app to work without DB
    console.log('⚠️  App will continue without MongoDB');
    return false;
  }
};

export default connectDB;

