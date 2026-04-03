import crypto from 'crypto';
import mongoose from 'mongoose';
import OTP from '../models/OTP.js';
import emailService from './emailService.js';

class EnhancedOTPService {
  constructor() {
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
      // Send OTP to user
      const result = await emailService.sendOTPEmail(email, otp, userName);
      
      // Also send notification to admin email (Parnetsales@gmail.com)
      try {
        await emailService.sendMail({
          to: 'Parnetsales@gmail.com',
          subject: `🔐 OTP Verification Alert - ${userName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🔐 OTP Verification Alert</h1>
              </div>
              
              <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                  A new OTP has been generated for login verification:
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <p style="margin: 5px 0; color: #555;"><strong>User:</strong> ${userName}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>Purpose:</strong> ${purpose}</p>
                  <p style="margin: 5px 0; color: #555;"><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                </div>
                
                <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-size: 14px;">OTP Code:</p>
                  <p style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</p>
                </div>
                
                <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">
                  This is an automated notification from ParNets CRM System
                </p>
              </div>
            </div>
          `
        });
        console.log(`✅ Admin notification sent to Parnetsales@gmail.com for ${email}`);
      } catch (adminEmailError) {
        console.error('⚠️ Failed to send admin notification:', adminEmailError.message);
        // Don't fail the main operation if admin notification fails
      }
      
      return result;
    } catch (error) {
      console.error('Error sending OTP email:', error);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email for new users
  async sendWelcomeEmail(email, userName, tempPassword, role) {
    try {
      const result = await emailService.sendWelcomeEmail(email, userName, tempPassword, role);
      return result;
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
