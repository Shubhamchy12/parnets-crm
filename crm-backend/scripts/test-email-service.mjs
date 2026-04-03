import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🧪 Testing Email Service Configuration...\n');

// Check environment variables
console.log('📧 SMTP Configuration:');
console.log(`   Host: ${process.env.SMTP_HOST || 'NOT SET'}`);
console.log(`   Port: ${process.env.SMTP_PORT || 'NOT SET'}`);
console.log(`   User: ${process.env.SMTP_USER || 'NOT SET'}`);
console.log(`   Pass: ${process.env.SMTP_PASS ? '***configured***' : 'NOT SET'}`);
console.log(`   From: ${process.env.SMTP_FROM_NAME || 'NOT SET'}\n`);

// Import email service after env is loaded
const emailServiceModule = await import('../services/emailService.js');
const emailService = emailServiceModule.default;

console.log('✅ Email service imported successfully');
console.log(`   Configured: ${emailService.isConfigured}`);
console.log(`   From Email: ${emailService.fromEmail || 'NOT SET'}`);
console.log(`   From Name: ${emailService.fromName || 'NOT SET'}\n`);

if (!emailService.isConfigured) {
  console.error('❌ Email service is not configured properly!');
  console.error('   Please check your SMTP settings in .env file\n');
  process.exit(1);
}

console.log('✅ Email service is ready to send emails!');
console.log('   You can now use the email functionality in your application.\n');

process.exit(0);
