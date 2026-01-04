import crypto from 'crypto';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import OTP from '../models/OTP.js';
import MockEmailService from './mockEmailService.js';

class EnhancedOTPService {
  constructor() {
    // Use mock email service in development if SMTP is not configured
    const isProduction = process.env.NODE_ENV === 'production';
    const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
    
    if (!isProduction && !hasSmtpConfig) {
      console.log('📧 SMTP not configured, using mock email service for development');
      console.log('🔧 To receive real emails, configure SMTP_USER and SMTP_PASS in .env file');
      this.transporter = new MockEmailService();
      this.isUsingMockService = true;
    } else {
      // Configure real email transporter
      console.log('📧 Using real SMTP service for email delivery');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      this.isUsingMockService = false;
    }
    
    this.otpLength = 6;
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.maxAttempts = 3;
  }

  // Generate 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Hash OTP for secure storage
  hashOTP(otp) {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  // Generate OTP with expiry and save to database
  async generateOTPWithExpiry(userId, purpose = 'login', ipAddress = null, userAgent = null) {
    try {
      // Invalidate any existing OTPs for this user and purpose
      await OTP.updateMany(
        { userId, purpose, isUsed: false },
        { $set: { isUsed: true } }
      );

      const otp = this.generateOTP();
      const hashedCode = this.hashOTP(otp);
      const expiresAt = new Date(Date.now() + this.otpExpiry);
      
      // Create new OTP record
      const otpRecord = await OTP.create({
        userId,
        code: otp,
        hashedCode,
        expiresAt,
        purpose,
        ipAddress,
        userAgent,
        maxAttempts: this.maxAttempts
      });

      return {
        otp,
        expiry: expiresAt,
        otpId: otpRecord._id
      };
    } catch (error) {
      console.error('Error generating OTP:', error);
      throw new Error('Failed to generate OTP');
    }
  }

  // Verify OTP using database record
  async verifyOTP(userId, inputOTP, purpose = 'login') {
    try {
      // Development mode: Accept static OTP 123456
      if (process.env.NODE_ENV === 'development' && inputOTP === '123456') {
        return {
          valid: true,
          otpId: 'development-static-otp'
        };
      }

      // Find valid OTP for user
      const otpRecord = await OTP.findValidOTP(userId, purpose);
      
      if (!otpRecord) {
        return {
          valid: false,
          error: 'No valid OTP found. Please request a new one.'
        };
      }

      // Check if OTP has expired
      if (otpRecord.isExpired) {
        return {
          valid: false,
          error: 'OTP has expired. Please request a new one.'
        };
      }

      // Check if max attempts exceeded
      if (otpRecord.attempts >= otpRecord.maxAttempts) {
        return {
          valid: false,
          error: 'Maximum verification attempts exceeded. Please request a new OTP.'
        };
      }

      // Verify OTP
      const inputHash = this.hashOTP(inputOTP);
      const isValid = inputHash === otpRecord.hashedCode;

      if (isValid) {
        // Mark OTP as used
        await otpRecord.markAsUsed();
        return {
          valid: true,
          otpId: otpRecord._id
        };
      } else {
        // Increment attempts
        await otpRecord.incrementAttempts();
        return {
          valid: false,
          error: 'Invalid OTP. Please try again.',
          attemptsRemaining: otpRecord.maxAttempts - otpRecord.attempts - 1
        };
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return {
        valid: false,
        error: 'Failed to verify OTP. Please try again.'
      };
    }
  }

  // Send OTP via email
  async sendOTPEmail(email, otp, userName = 'User', purpose = 'login') {
    try {
      const subject = this.getEmailSubject(purpose);
      const html = this.getEmailTemplate(otp, userName, purpose);

      const mailOptions = {
        from: {
          name: 'CRM System',
          address: process.env.SMTP_FROM || process.env.SMTP_USER
        },
        to: email,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Get email subject based on purpose
  getEmailSubject(purpose) {
    switch (purpose) {
      case 'login':
        return 'Your CRM Login OTP';
      case 'password_reset':
        return 'Password Reset OTP - CRM System';
      case 'email_verification':
        return 'Email Verification OTP - CRM System';
      default:
        return 'Your CRM System OTP';
    }
  }

  // Get email template based on purpose
  getEmailTemplate(otp, userName, purpose) {
    const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CRM System OTP</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #2563eb; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .otp-code { font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 5px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 CRM System</h1>
            <p>${this.getHeaderText(purpose)}</p>
          </div>
          
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>${this.getContentText(purpose)}</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p><strong>This OTP is valid for 10 minutes only</strong></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This OTP is for single use only</li>
                <li>Do not share this OTP with anyone</li>
                <li>If you didn't request this, please contact your administrator immediately</li>
                <li>The OTP will expire in 10 minutes</li>
                <li>Maximum 3 verification attempts allowed</li>
              </ul>
            </div>
            
            <p>If you're having trouble, please contact your system administrator.</p>
            
            <div class="footer">
              <p>This is an automated message from CRM System</p>
              <p>© ${new Date().getFullYear()} CRM System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return baseTemplate;
  }

  // Get header text based on purpose
  getHeaderText(purpose) {
    switch (purpose) {
      case 'login':
        return 'One-Time Password (OTP) for Login';
      case 'password_reset':
        return 'Password Reset Verification';
      case 'email_verification':
        return 'Email Address Verification';
      default:
        return 'One-Time Password (OTP) Verification';
    }
  }

  // Get content text based on purpose
  getContentText(purpose) {
    switch (purpose) {
      case 'login':
        return 'You have requested to login to the CRM System. Please use the following One-Time Password (OTP) to complete your login:';
      case 'password_reset':
        return 'You have requested to reset your password. Please use the following OTP to verify your identity:';
      case 'email_verification':
        return 'Please use the following OTP to verify your email address:';
      default:
        return 'Please use the following One-Time Password (OTP) to proceed:';
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
              .header { background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
              .credentials-box { background: white; border: 2px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 8px; }
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
                  <li>Check your email for the OTP (valid for 10 minutes)</li>
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

  // Cleanup expired OTPs (to be called by cron job)
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.cleanupExpired();
      console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
      return result;
    } catch (error) {
      console.error('Error cleaning up OTPs:', error);
      return null;
    }
  }

  // Get OTP statistics for monitoring
  async getOTPStats(userId = null) {
    try {
      const matchStage = userId ? { userId: mongoose.Types.ObjectId(userId) } : {};
      
      const stats = await OTP.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalOTPs: { $sum: 1 },
            usedOTPs: { $sum: { $cond: ['$isUsed', 1, 0] } },
            expiredOTPs: { $sum: { $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0] } },
            avgAttempts: { $avg: '$attempts' }
          }
        }
      ]);

      return stats[0] || {
        totalOTPs: 0,
        usedOTPs: 0,
        expiredOTPs: 0,
        avgAttempts: 0
      };
    } catch (error) {
      console.error('Error getting OTP stats:', error);
      return null;
    }
  }
}

export default new EnhancedOTPService();