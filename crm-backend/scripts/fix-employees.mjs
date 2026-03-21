import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

await mongoose.connect('mongodb+srv://parnetstech13:parnetstech13@cluster0.svfj4.mongodb.net/crm-system?retryWrites=true&w=majority');

const User = mongoose.model('User', new mongoose.Schema({
  name: String, email: String, role: String, status: String, password: { type: String, select: false },
}, { strict: false }));

const newPassword = await bcrypt.hash('123456789', 12);

// Fix shubham@gmail.com — set active + reset password
const r1 = await User.updateOne(
  { email: 'shubham@gmail.com' },
  { status: 'active', password: newPassword }
);

// Fix shubhams@gmail.com — reset password to 123456789
const r2 = await User.updateOne(
  { email: 'shubhams@gmail.com' },
  { status: 'active', password: newPassword }
);

console.log('shubham@gmail.com  updated:', r1.modifiedCount, '✅');
console.log('shubhams@gmail.com updated:', r2.modifiedCount, '✅');
console.log('\nBoth accounts now:');
console.log('  status   → active');
console.log('  password → 123456789');

await mongoose.disconnect();
