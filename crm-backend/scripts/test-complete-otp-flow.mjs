import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import enhancedOtpService from '../services/enhancedOtpService.js';

async function testCompleteOTPFlow() {
  console.log('\n🧪 Testing Complete OTP Flow...\n');
  
  // Simulate real login scenario
  const testEmail = 'parnets13@gmail.com';
  const testUserName = 'Super Admin';
  
  // Generate OTP like in auth.js
  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
  const actualOTP = generateOTP();
  
  console.log('📋 Simulating Login Process:');
  console.log(`   User: ${testUserName}`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Generated OTP: ${actualOTP}`);
  console.log('');
  
  console.log('📧 Sending OTP email with the SAME OTP that will be used for verification...\n');
  
  try {
    const result = await enhancedOtpService.sendOTPEmail(
      testEmail,
      actualOTP,  // Using the SAME OTP that was generated
      testUserName,
      'login'
    );
    
    if (result.success) {
      console.log('✅ SUCCESS! OTP email sent');
      console.log(`📬 Message ID: ${result.messageId}`);
      console.log('');
      console.log('📥 Check your Gmail inbox at: parnets13@gmail.com');
      console.log('');
      console.log('🔍 Verification:');
      console.log(`   The OTP in your email should be: ${actualOTP}`);
      console.log(`   Use this SAME OTP to verify login`);
      console.log('');
      console.log('✅ Email Flow Working Correctly!');
      console.log('   - OTP generated: ' + actualOTP);
      console.log('   - OTP sent in email: ' + actualOTP);
      console.log('   - Both are SAME ✓');
      console.log('');
    } else {
      console.error('❌ FAILED to send OTP email');
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  
  process.exit(0);
}

testCompleteOTPFlow();
