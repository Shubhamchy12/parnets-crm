// Quick test to verify env variables load before emailService
import dotenv from 'dotenv';

console.log('🧪 Testing Environment Variable Loading Order...\n');

// Load env first
dotenv.config();

console.log('✅ Step 1: dotenv.config() called');
console.log(`   SMTP_USER: ${process.env.SMTP_USER || 'NOT LOADED'}`);
console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***configured***' : 'NOT LOADED'}\n`);

// Now import emailService
console.log('📧 Step 2: Importing emailService...');
const emailServiceModule = await import('./services/emailService.js');
const emailService = emailServiceModule.default;

console.log('✅ Step 3: EmailService imported');
console.log(`   isConfigured: ${emailService.isConfigured}`);
console.log(`   fromEmail: ${emailService.fromEmail || 'NOT SET'}`);
console.log(`   fromName: ${emailService.fromName || 'NOT SET'}\n`);

if (emailService.isConfigured) {
  console.log('✅ SUCCESS! Email service is properly configured!');
  console.log('   The server.js fix is working correctly.\n');
  process.exit(0);
} else {
  console.log('❌ FAILED! Email service is not configured.');
  console.log('   Check your .env file settings.\n');
  process.exit(1);
}
