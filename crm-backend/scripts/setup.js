/**
 * Initial setup script — run once to create the super admin user.
 * Usage: node scripts/setup.js
 *
 * After running, log in with:
 *   Email:    admin@parnets.com
 *   Password: Admin@123
 *
 * Then create employees and sales users from the User Management page in the UI.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://parnetstech13:parnets13@cluster0.svfj4.mongodb.net/crm-system?retryWrites=true&w=majority';

// Inline user schema to avoid circular imports
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['super_admin', 'admin', 'employee', 'sales'], default: 'employee' },
  status:   { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  permissions: {
    modules: {
      dashboard:  { type: Boolean, default: true },
      clients:    { type: Boolean, default: false },
      projects:   { type: Boolean, default: false },
      employees:  { type: Boolean, default: false },
      attendance: { type: Boolean, default: false },
      payments:   { type: Boolean, default: false },
      invoices:   { type: Boolean, default: false },
      support:    { type: Boolean, default: false },
      reports:    { type: Boolean, default: false },
      settings:   { type: Boolean, default: false },
    },
    actions: {
      create: { type: Boolean, default: false },
      read:   { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
    }
  },
  department:  String,
  designation: String,
  phone:       String,
  joiningDate: { type: Date, default: Date.now },
}, { timestamps: true });

const ADMIN_PERMISSIONS = {
  modules: { dashboard:true, clients:true, projects:true, employees:true, attendance:true, payments:true, invoices:true, support:true, reports:true, settings:true },
  actions: { create:true, read:true, update:true, delete:true, export:true, import:true },
};

const EMPLOYEE_PERMISSIONS = {
  modules: { dashboard:true, clients:false, projects:true, employees:false, attendance:true, payments:false, invoices:false, support:true, reports:false, settings:false },
  actions: { create:false, read:true, update:false, delete:false, export:false, import:false },
};

const SALES_PERMISSIONS = {
  modules: { dashboard:true, clients:true, projects:true, employees:true, attendance:false, payments:false, invoices:true, support:true, reports:false, settings:false },
  actions: { create:true, read:true, update:true, delete:false, export:true, import:false },
};

async function setup() {
  console.log('\n🔧 Parnets CRM — Initial Setup\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  const User = mongoose.model('User', userSchema);

  // ── Users to create ──────────────────────────────────────────────
  const users = [
    {
      name: 'Super Admin',
      email: 'admin@crm.com',
      password: 'admin123',
      role: 'super_admin',
      designation: 'Administrator',
      department: 'Management',
      permissions: ADMIN_PERMISSIONS,
    },
    {
      name: 'Sales User',
      email: 'sales@crm.com',
      password: 'sales123',
      role: 'sales',
      designation: 'Sales Executive',
      department: 'Sales',
      permissions: SALES_PERMISSIONS,
    },
    {
      name: 'Employee User',
      email: 'employee@crm.com',
      password: 'employee123',
      role: 'employee',
      designation: 'Staff',
      department: 'Operations',
      permissions: EMPLOYEE_PERMISSIONS,
    },
  ];

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`⚠️  Already exists — skipping: ${u.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 12);
    await User.create({ ...u, password: hashed, status: 'active' });
    console.log(`✅ Created [${u.role.padEnd(11)}]  ${u.email}  /  ${u.password}`);
  }

  console.log('\n──────────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Admin    →  admin@crm.com    /  admin123');
  console.log('  Sales    →  sales@crm.com    /  sales123');
  console.log('  Employee →  employee@crm.com /  employee123');
  console.log('──────────────────────────────────────────');
  console.log('\nOnce logged in as admin, create more users from:');
  console.log('  Settings → User Management\n');

  await mongoose.disconnect();
  process.exit(0);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
