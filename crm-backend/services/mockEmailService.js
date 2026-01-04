// Mock email service for development - logs emails to console instead of sending
class MockEmailService {
  constructor() {
    console.log('📧 Using Mock Email Service for development');
  }

  // Mock send email method
  async sendMail(mailOptions) {
    console.log('\n📧 ===== MOCK EMAIL =====');
    console.log('From:', mailOptions.from);
    console.log('To:', mailOptions.to);
    console.log('Subject:', mailOptions.subject);
    
    // Extract OTP from HTML content
    const otpMatch = mailOptions.html.match(/<div class="otp-code">(\d{6})<\/div>/);
    if (otpMatch) {
      console.log('🔐 OTP CODE:', otpMatch[1]);
    }
    
    console.log('========================\n');
    
    // Return success response
    return {
      messageId: `mock-${Date.now()}@localhost`,
      accepted: [mailOptions.to],
      rejected: [],
      response: '250 Message queued'
    };
  }

  // Mock verify method
  async verify() {
    return true;
  }
}

export default MockEmailService;