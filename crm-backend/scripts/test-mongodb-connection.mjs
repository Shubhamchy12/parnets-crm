import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('\n🔍 Testing MongoDB Connection...\n');
console.log('Connection String:', process.env.MONGODB_URI?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
console.log('');

async function testConnection() {
  try {
    console.log('⏳ Attempting to connect...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Connection details:');
    console.log('   - Host:', mongoose.connection.host);
    console.log('   - Database:', mongoose.connection.name);
    console.log('   - Ready State:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed!');
    console.error('Error:', error.message);
    console.error('\n📋 Troubleshooting Steps:');
    console.error('1. Go to https://cloud.mongodb.com/');
    console.error('2. Select your project and cluster');
    console.error('3. Click "Network Access" in left sidebar');
    console.error('4. Click "Add IP Address"');
    console.error('5. Click "Allow Access from Anywhere" (0.0.0.0/0)');
    console.error('6. Click "Confirm"');
    console.error('7. Wait 1-2 minutes for changes to apply');
    console.error('8. Try running this script again\n');
    
    if (error.message.includes('EREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('⚠️  Network/DNS Issue: Cannot reach MongoDB Atlas');
      console.error('   - Check your internet connection');
      console.error('   - Check if firewall is blocking MongoDB ports');
      console.error('   - Verify the cluster hostname is correct\n');
    }
    
    if (error.message.includes('authentication failed')) {
      console.error('⚠️  Authentication Issue: Username or password incorrect');
      console.error('   - Go to "Database Access" in MongoDB Atlas');
      console.error('   - Verify user "parnetstech13" exists');
      console.error('   - Reset password if needed\n');
    }
    
    process.exit(1);
  }
}

testConnection();
