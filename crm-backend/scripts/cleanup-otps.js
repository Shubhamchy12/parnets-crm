import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OTP from '../models/OTP.js';

dotenv.config();

async function cleanupOTPs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-database');
    console.log('✅ Connected to MongoDB');

    // Delete all OTPs
    const result = await OTP.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} OTP records`);

    console.log('✅ OTPs cleaned up');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupOTPs();