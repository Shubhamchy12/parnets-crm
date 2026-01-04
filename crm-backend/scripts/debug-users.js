import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import OTP from '../models/OTP.js';

dotenv.config();

async function debugUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-database');
    console.log('✅ Connected to MongoDB');

    // List all users
    const users = await User.find({}).select('name email role status');
    console.log('\n👥 Users in database:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}, Status: ${user.status}`);
    });

    // List all OTPs
    const otps = await OTP.find({}).select('+code +hashedCode');
    console.log('\n🔐 OTPs in database:');
    otps.forEach(otp => {
      console.log(`- User: ${otp.userId}, Code: ${otp.code}, Purpose: ${otp.purpose}, Used: ${otp.isUsed}, Expired: ${otp.isExpired}, Attempts: ${otp.attempts}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugUsers();