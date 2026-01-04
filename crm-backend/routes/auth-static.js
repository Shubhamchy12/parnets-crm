import express from 'express';
import User from '../models/User.js';
import jwtService from '../services/jwtService.js';
import staticOtpService from '../services/staticOtpService.js';
import { authenticate, rateLimitSensitive } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Step 1: Login with email and password
router.post('/login', rateLimitSensitive(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate and send OTP using static service
    const otpResult = await staticOtpService.generateOTPWithExpiry(user._id, 'login');
    
    if (!otpResult) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      });
    }

    // Send OTP via email (static service will just log to console)
    const emailResult = await staticOtpService.sendOTPEmail(user.email, otpResult.otp, user.name, 'login');
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email address. Use 123456 for development.',
      data: {
        email: user.email,
        otpSent: true,
        expiresIn: 10, // minutes
        developmentOTP: '123456' // Show OTP in response for development
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Step 2: Verify OTP and complete login
router.post('/verify-otp', rateLimitSensitive(3, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Verify OTP using static service
    const otpVerification = await staticOtpService.verifyOTP(user._id, otp, 'login');

    if (!otpVerification.valid) {
      return res.status(401).json({
        success: false,
        message: otpVerification.error,
        attemptsRemaining: otpVerification.attemptsRemaining,
        hint: 'Use 123456 for development'
      });
    }

    // Clear OTP data and update user
    user.lastLogin = new Date();
    
    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    await user.save();

    // Generate JWT tokens
    const tokens = jwtService.generateSimpleTokens(user);

    // Remove sensitive data from user object
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.otpSecret;
    delete userResponse.otpExpiry;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        ...tokens
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Resend OTP
router.post('/resend-otp', rateLimitSensitive(3, 5 * 60 * 1000), async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Generate new OTP using static service
    const otpResult = await staticOtpService.generateOTPWithExpiry(user._id, 'login');
    
    if (!otpResult) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      });
    }

    // Send OTP via email (static service will just log to console)
    const emailResult = await staticOtpService.sendOTPEmail(user.email, otpResult.otp, user.name, 'login');
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'New OTP sent to your email address. Use 123456 for development.',
      data: {
        email: user.email,
        expiresIn: 10, // minutes
        developmentOTP: '123456' // Show OTP in response for development
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // Get user
    const user = await User.findById(decoded.userId);
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = jwtService.generateSimpleTokens(user);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -otpSecret -otpExpiry');
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a production environment, you might want to blacklist the token
    // For now, we'll just return success as the client will remove the token
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;