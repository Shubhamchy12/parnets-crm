import dotenv from 'dotenv';
import enhancedOtpService from './services/enhancedOtpService.js';

// Load environment variables
dotenv.config();

async function testEmailService() {
  console.log('🧪 Testing Email Service Configuration...\n');
  
  // Check if SMTP is configured
  const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('Environment:', process.env.NODE_ENV);
  console.log('SMTP User:', process.env.SMTP_USER);
  console.log('SMTP Pass:', process.env.SMTP_PASS ? '***configured***' : 'NOT SET');
  console.log('Has SMTP Config:', hasSmtpConfig);
  console.log('Will use real email:', hasSmtpConfig || isProduction);
  
  if (!hasSmtpConfig && !isProduction) {
    console.log('\n❌ SMTP not configured - will use mock email service');
    console.log('📧 OTPs will only appear in console, not in actual email');
    console.log('\n🔧 To fix this:');
    console.log('1. Set up Gmail App Password');
    console.log('2. Update SMTP_USER and SMTP_PASS in .env file');
    return;
  }
  
  console.log('\n✅ SMTP configured - will send real emails');
  
  // Test sending an OTP email
  try {
    console.log('\n📧 Sending test OTP email...');
    const result = await enhancedOtpService.sendOTPEmail(
      process.env.SMTP_USER, // Send to the configured email
      '123456', // Test OTP
      'Test User',
      'login'
    );
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('Message ID:', result.messageId);
      console.log('\n📬 Check your email inbox for the test OTP');
    } else {
      console.log('❌ Failed to send test email');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ Error testing email service:', error.message);
  }
}

// Run the test
testEmailService().catch(console.error);