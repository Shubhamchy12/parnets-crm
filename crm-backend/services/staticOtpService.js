import crypto from 'crypto';
import mongoose from 'mongoose';
import OTP from '../models/OTP.js';

class StaticOTPService {
  constructor() {
    console.log('🔐 Using Static OTP Service for development');
    console.log('📝 Static OTP: 123456 (valid for all users)');
    
    this.staticOTP = '123456';
    this.otpLength = 6;
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes in milliseconds
    this.maxAttempts = 3;
  }

  // Generate static OTP
  generateOTP() {
    return this.staticOTP;
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

      console.log(`🔐 Generated static OTP for user ${userId}: ${otp}`);

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

      // Verify OTP (accept both static OTP and the actual stored OTP)
      const inputHash = this.hashOTP(inputOTP);
      const isValidStatic = inputOTP === this.staticOTP;
      const isValidStored = inputHash === otpRecord.hashedCode;
      const isValid = isValidStatic || isValidStored;

      if (isValid) {
        // Mark OTP as used
        await otpRecord.markAsUsed();
        console.log(`✅ OTP verified successfully for user ${userId}`);
        return {
          valid: true,
          otpId: otpRecord._id
        };
      } else {
        // Increment attempts
        await otpRecord.incrementAttempts();
        console.log(`❌ Invalid OTP attempt for user ${userId}. Expected: ${this.staticOTP}, Got: ${inputOTP}`);
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

  // Mock send OTP via email (just log to console)
  async sendOTPEmail(email, otp, userName = 'User', purpose = 'login') {
    console.log('\n📧 ===== STATIC OTP EMAIL =====');
    console.log('To:', email);
    console.log('Subject: Your CRM Login OTP');
    console.log('🔐 STATIC OTP CODE:', this.staticOTP);
    console.log('📝 Use this OTP to login: 123456');
    console.log('⏰ Valid for 10 minutes');
    console.log('===============================\n');
    
    return { 
      success: true, 
      messageId: `static-otp-${Date.now()}@localhost` 
    };
  }

  // Mock send welcome email
  async sendWelcomeEmail(email, userName, tempPassword, role) {
    console.log('\n📧 ===== WELCOME EMAIL =====');
    console.log('To:', email);
    console.log('Subject: Welcome to CRM System');
    console.log('Username:', userName);
    console.log('Temp Password:', tempPassword);
    console.log('Role:', role);
    console.log('🔐 Remember: Use OTP 123456 for login');
    console.log('============================\n');
    
    return { 
      success: true, 
      messageId: `welcome-${Date.now()}@localhost` 
    };
  }

  // Cleanup expired OTPs
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

  // Get OTP statistics
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

export default new StaticOTPService();