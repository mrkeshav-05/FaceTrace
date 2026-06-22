import mongoose from 'mongoose';
// import 'dotenv/config'; // Add this line
import dotenv from 'dotenv'; // Add this line
dotenv.config({ path: './.env' }); // Add this line

const connectDB = async () => {
  try {
    // Add debug log to verify connection string
    // console.log('Connecting to:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

export default connectDB;