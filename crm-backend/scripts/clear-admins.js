import mongoose from 'mongoose';
import User from '../models/User.js';
import AdminRegistration from '../models/AdminRegistration.js';
import dotenv from 'dotenv';

dotenv.config();

const clearAdmins = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-database');
    console.log('✅ Connected to MongoDB');

    // Clear all admin users
    const result = await User.deleteMany({ 
      role: { $in: ['super_admin', 'admin'] } 
    });
    console.log(`🗑️ Deleted ${result.deletedCount} admin users`);

    // Clear admin registration records
    const regResult = await AdminRegistration.deleteMany({});
    console.log(`🗑️ Deleted ${regResult.deletedCount} admin registration records`);

    console.log('✅ Admin users cleared successfully!');
    console.log('🔧 Admin registration is now available on the login page');

  } catch (error) {
    console.error('❌ Error clearing admin users:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

clearAdmins();