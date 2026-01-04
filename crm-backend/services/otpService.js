import crypto from 'crypto';
import nodemailer from 'nodemailer';

class OTPService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Generate 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Generate OTP with expiry (5 minutes)
  generateOTPWithExpiry() {
    const otp = this.generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    return {
      otp,
      expiry,
      hash: this.hashOTP(otp)
    };
  }

  // Hash OTP for secure storage
  hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  // Verify OTP
  verifyOTP(inputOTP, hashedOTP) {
    const inputHash = this.hashOTP(inputOTP);
    return inputHash === hashedOTP;
  }

  // Send OTP via email
  async sendOTPEmail(email, otp, userName = 'User') {
    try {
      const mailOptions = {
        from: {
          name: 'CRM System',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Your CRM Login OTP',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CRM Login OTP</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 CRM System Login</h1>
                <p>One-Time Password (OTP) Verification</p>
              </div>
              
              <div class="content">
                <h2>Hello ${userName},</h2>
                <p>You have requested to login to the CRM System. Please use the following One-Time Password (OTP) to complete your login:</p>
                
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                  <p><strong>This OTP is valid for 5 minutes only</strong></p>
                </div>
                
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul>
                    <li>This OTP is for single use only</li>
                    <li>Do not share this OTP with anyone</li>
                    <li>If you didn't request this login, please contact your administrator immediately</li>
                    <li>The OTP will expire in 5 minutes</li>
                  </ul>
                </div>
                
                <p>If you're having trouble logging in, please contact your system administrator.</p>
                
                <div class="footer">
                  <p>This is an automated message from CRM System</p>
                  <p>© ${new Date().getFullYear()} CRM System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email for new users
  async sendWelcomeEmail(email, userName, tempPassword, role) {
    try {
      const mailOptions = {
        from: {
          name: 'CRM System',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject: 'Welcome to CRM System - Account Created',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to CRM System</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .credentials-box { background: white; border: 2px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 8px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Welcome to CRM System</h1>
                <p>Your account has been created successfully</p>
              </div>
              
              <div class="content">
                <h2>Hello ${userName},</h2>
                <p>Your CRM System account has been created by the administrator. Here are your login credentials:</p>
                
                <div class="credentials-box">
                  <h3>Login Credentials:</h3>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                  <p><strong>Role:</strong> ${role.replace('_', ' ').toUpperCase()}</p>
                </div>
                
                <div class="warning">
                  <strong>🔒 Important Security Instructions:</strong>
                  <ul>
                    <li><strong>Change your password immediately</strong> after first login</li>
                    <li>Use a strong password with at least 8 characters</li>
                    <li>Include uppercase, lowercase, numbers, and special characters</li>
                    <li>Do not share your credentials with anyone</li>
                    <li>You will receive an OTP via email for each login</li>
                  </ul>
                </div>
                
                <h3>Login Process:</h3>
                <ol>
                  <li>Go to the CRM login page</li>
                  <li>Enter your email and temporary password</li>
                  <li>Check your email for the OTP</li>
                  <li>Enter the OTP to complete login</li>
                  <li>Change your password in your profile settings</li>
                </ol>
                
                <p>If you have any questions or need assistance, please contact your system administrator.</p>
                
                <div class="footer">
                  <p>This is an automated message from CRM System</p>
                  <p>© ${new Date().getFullYear()} CRM System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new OTPService();