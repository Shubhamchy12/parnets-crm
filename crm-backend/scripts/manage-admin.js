import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://parnetstech13:parnets13@cluster0.svfj4.mongodb.net/crm-system?retryWrites=true&w=majority');

const command = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];
const name = process.argv[5];

switch (command) {
  case 'list':
    console.log('📋 Current Admin Users:');
    const admins = await User.find({ role: { $in: ['super_admin', 'admin'] } }).select('name email role status');
    console.table(admins.map(admin => ({
      Name: admin.name,
      Email: admin.email,
      Role: admin.role,
      Status: admin.status
    })));
    break;

  case 'create':
    if (!email || !password) {
      console.error('❌ Usage: node manage-admin.js create <email> <password> [name]');
      process.exit(1);
    }
    
    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.error(`❌ User with email ${email} already exists`);
        process.exit(1);
      }

      const admin = await User.createSuperAdmin({
        name: name || 'Admin User',
        email: email,
        password: password
      });
      
      console.log(`✅ Super Admin created successfully:`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
    } catch (error) {
      console.error('❌ Error creating admin:', error.message);
    }
    break;

  case 'delete':
    if (!email) {
      console.error('❌ Usage: node manage-admin.js delete <email>');
      process.exit(1);
    }
    
    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.error(`❌ User with email ${email} not found`);
        process.exit(1);
      }

      if (user.role !== 'super_admin' && user.role !== 'admin') {
        console.error(`❌ User ${email} is not an admin`);
        process.exit(1);
      }

      await User.deleteOne({ email });
      console.log(`✅ Admin user ${email} deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting admin:', error.message);
    }
    break;

  case 'change-password':
    if (!email || !password) {
      console.error('❌ Usage: node manage-admin.js change-password <email> <new-password>');
      process.exit(1);
    }
    
    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.error(`❌ User with email ${email} not found`);
        process.exit(1);
      }

      user.password = password;
      await user.save();
      console.log(`✅ Password changed successfully for ${email}`);
    } catch (error) {
      console.error('❌ Error changing password:', error.message);
    }
    break;

  default:
    console.log(`
🔧 CRM Admin Management Tool

Usage:
  node manage-admin.js <command> [options]

Commands:
  list                                    - List all admin users
  create <email> <password> [name]        - Create new super admin
  delete <email>                          - Delete admin user
  change-password <email> <new-password>  - Change admin password

Examples:
  node manage-admin.js list
  node manage-admin.js create john@company.com mypassword123 "John Doe"
  node manage-admin.js delete admin@crm.com
  node manage-admin.js change-password john@company.com newpassword456
`);
}

await mongoose.disconnect();
process.exit(0);