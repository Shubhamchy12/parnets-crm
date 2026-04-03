#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🧪 Testing Email Sending...\n');

// Import email service after env is loaded
const emailService = (await import('../services/emailService.js')).default;

// Test sending an email
async function testSendEmail() {
  console.log('📧 Attempting to send test email...\n');

  const testEmail = process.env.SMTP_USER; // Send to yourself for testing
  
  const result = await emailService.sendMail({
    to: testEmail,
    subject: 'Test Email from CRM System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">✅ Email Service Test</h2>
        <p>This is a test email from your CRM system.</p>
        <p>If you're reading this, your email service is configured correctly!</p>
        <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #64748b; font-size: 14px;">
          Sent at: ${new Date().toLocaleString('en-IN')}
        </p>
      </div>
    `
  });

  if (result.success) {
    console.log('✅ Test email sent successfully!');
    console.log(`   To: ${testEmail}`);
    console.log(`   Message ID: ${result.messageId}`);
    console.log('\n🎉 Email service is working properly!');
  } else {
    console.error('❌ Failed to send test email');
    console.error(`   Error: ${result.error}`);
  }

  return result;
}

// Run the test
testSendEmail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
