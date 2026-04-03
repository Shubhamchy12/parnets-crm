import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import enhancedOtpService from '../services/enhancedOtpService.js';

async function testOTPEmail() {
  console.log('\n🧪 Testing OTP Email Service...\n');
  
  const testEmail = 'Parnetsales@gmail.com';
  const testOTP = '123456';
  const testUserName = 'Super Admin';
  
  console.log(`📧 Sending test OTP to: ${testEmail}`);
  console.log(`🔐 OTP: ${testOTP}`);
  console.log(`👤 User: ${testUserName}\n`);
  
  try {
    const result = await enhancedOtpService.sendOTPEmail(
      testEmail,
      testOTP,
      testUserName,
      'login-test'
    );
    
    if (result.success) {
      console.log('✅ SUCCESS! OTP email sent successfully');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log(`\n📥 Check your inbox at: ${testEmail}`);
      console.log(`📥 Also check admin notification at: Parnetsales@gmail.com\n`);
    } else {
      console.error('❌ FAILED to send OTP email');
      console.error(`Error: ${result.error}\n`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

testOTPEmail();
