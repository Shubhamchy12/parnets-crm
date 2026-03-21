import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

await mongoose.connect('mongodb+srv://parnetstech13:parnetstech13@cluster0.svfj4.mongodb.net/crm-system?retryWrites=true&w=majority');

const User = mongoose.model('User', new mongoose.Schema({
  name: String, email: String, role: String, status: String,
  password: { type: String, select: false },
  department: String, designation: String,
}, { strict: false }));

const users = await User.find({ role: { $nin: ['super_admin', 'admin'] } }).select('+password').lean();

console.log(`\nTotal employees: ${users.length}\n`);
for (const u of users) {
  console.log('─────────────────────────');
  console.log('Name    :', u.name);
  console.log('Email   :', u.email);
  console.log('Role    :', u.role);
  console.log('Status  :', u.status);
  console.log('Password:', u.password ? `EXISTS (${u.password.length} chars, starts: ${u.password.substring(0,7)})` : 'MISSING ❌');

  // Test common passwords
  if (u.password) {
    const tests = ['123456789', '12345678', '123456', 'password', '1234567890'];
    for (const p of tests) {
      const match = await bcrypt.compare(p, u.password);
      if (match) { console.log(`Password match: "${p}" ✅`); break; }
    }
  }
}

await mongoose.disconnect();
