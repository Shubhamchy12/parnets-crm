import mongoose from 'mongoose';
import dotenv from 'dotenv';
import AdminRegistration from '../models/AdminRegistration.js';
import User from '../models/User.js';

dotenv.config();

async function resetAdminRegistration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://parnetstech13:parnets13@cluster0.svfj4.mongodb.net/crm-system?retryWrites=true&w=majority');
    console.log('✅ Connected to MongoDB');

    // Delete all admin registration records
    const deletedRegistrations = await AdminRegistration.deleteMany({});
    console.log(`🗑️  Deleted ${deletedRegistrations.deletedCount} admin registration records`);

    // Delete all super admin users
    const deletedAdmins = await User.deleteMany({ role: 'super_admin' });
    console.log(`🗑️  Deleted ${deletedAdmins.deletedCount} super admin users`);

    console.log('✅ Admin registration has been reset');
    console.log('🔄 You can now register a new admin through the frontend');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin registration:', error);
    process.exit(1);
  }
}

resetAdminRegistration();