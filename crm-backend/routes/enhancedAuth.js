import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import jwtService from '../services/jwtService.js';
import staticOtpService from '../services/staticOtpService.js';
import enhancedOtpService from '../services/enhancedOtpService.js';
import { authenticate, rateLimitSensitive, detectSuspiciousActivity, requireFreshAuth, authorize } from '../middleware/enhancedAuth.js';
import Session from '../models/Session.js';
import cleanupService from '../services/cleanupService.js';
import crypto from 'crypto';

const router = express.Router();

// Validation middleware
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const otpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

// Helper function to get device info from user agent
const getDeviceInfo = (userAgent) => {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[0] || 'Unknown';
  const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[0] || 'Unknown';
  
  return {
    browser,
    os,
    device: isMobile ? 'Mobile' : 'Desktop',
    isMobile
  };
};

// Step 1: Enhanced login with email and password validation
router.post('/login', 
  loginValidation,
  rateLimitSensitive(5, 15 * 60 * 1000), 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent') || 'Unknown';
      const deviceInfo = getDeviceInfo(userAgent);

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
        const lockUntil = user.lockUntil ? new Date(user.lockUntil).toLocaleString() : 'unknown';
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to multiple failed login attempts.',
          lockUntil
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

      // Generate and send OTP using enhanced service
      const otpResult = await enhancedOtpService.generateOTPWithExpiry(
        user._id, 
        'login', 
        ipAddress, 
        userAgent
      );
      
      if (!otpResult) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate OTP. Please try again.'
        });
      }

      // Send OTP via email
      const emailResult = await enhancedOtpService.sendOTPEmail(
        user.email, 
        otpResult.otp, 
        user.name, 
        'login'
      );
      
      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again.',
          error: emailResult.error
        });
      }

      // Log successful OTP generation
      console.log(`OTP generated for user ${user.email} from IP ${ipAddress}`);

      res.json({
        success: true,
        message: 'OTP sent to your email address. Use 123456 for development.',
        data: {
          email: user.email,
          otpSent: true,
          expiresIn: 10, // minutes
          developmentOTP: process.env.NODE_ENV === 'development' ? '123456' : undefined,
          deviceInfo: {
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device: deviceInfo.device
          }
        }
      });

    } catch (error) {
      console.error('Enhanced login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Step 2: Enhanced OTP verification and session creation
router.post('/verify-otp', 
  otpValidation,
  rateLimitSensitive(3, 15 * 60 * 1000), 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, otp } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent') || 'Unknown';
      const deviceInfo = getDeviceInfo(userAgent);

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid request'
        });
      }

      // Verify OTP using enhanced service
      const otpVerification = await enhancedOtpService.verifyOTP(user._id, otp, 'login');

      if (!otpVerification.valid) {
        return res.status(401).json({
          success: false,
          message: otpVerification.error,
          attemptsRemaining: otpVerification.attemptsRemaining
        });
      }

      // Update user login information
      user.lastLogin = new Date();
      
      // Reset login attempts on successful login
      await user.resetLoginAttempts();
      await user.save();

      // Generate JWT tokens with session management
      const tokens = await jwtService.generateTokens(user, ipAddress, userAgent, deviceInfo);

      // Remove sensitive data from user object
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.otpSecret;
      delete userResponse.otpExpiry;

      // Log successful login
      console.log(`Successful login for user ${user.email} from IP ${ipAddress}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          ...tokens,
          loginInfo: {
            ipAddress,
            deviceInfo,
            loginTime: new Date().toISOString()
          }
        }
      });

    } catch (error) {
      console.error('Enhanced OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Enhanced resend OTP with better tracking
router.post('/resend-otp', 
  [body('email').isEmail().normalizeEmail()],
  rateLimitSensitive(3, 5 * 60 * 1000), 
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      const { email } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent') || 'Unknown';

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          success: true,
          message: 'If the email exists, a new OTP has been sent'
        });
      }

      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Account is not active'
        });
      }

      // Generate new OTP
      const otpResult = await enhancedOtpService.generateOTPWithExpiry(
        user._id, 
        'login', 
        ipAddress, 
        userAgent
      );
      
      if (!otpResult) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate OTP. Please try again.'
        });
      }

      // Send OTP via email
      const emailResult = await enhancedOtpService.sendOTPEmail(
        user.email, 
        otpResult.otp, 
        user.name, 
        'login'
      );
      
      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again.'
        });
      }

      console.log(`OTP resent for user ${user.email} from IP ${ipAddress}`);

      res.json({
        success: true,
        message: 'New OTP sent to your email address. Use 123456 for development.',
        data: {
          email: user.email,
          expiresIn: 10, // minutes
          developmentOTP: process.env.NODE_ENV === 'development' ? '123456' : undefined
        }
      });

    } catch (error) {
      console.error('Enhanced resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// Enhanced refresh token with session management
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent') || 'Unknown';

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Use enhanced JWT service to refresh token
    const tokens = await jwtService.refreshAccessToken(refreshToken, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens
    });

  } catch (error) {
    console.error('Enhanced refresh token error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired refresh token'
    });
  }
});

// Enhanced logout with session invalidation
router.post('/logout', authenticate, detectSuspiciousActivity, async (req, res) => {
  try {
    const token = req.token;
    
    // Invalidate session using enhanced JWT service
    const invalidated = await jwtService.invalidateSession(token, 'logout');
    
    if (invalidated) {
      console.log(`User ${req.user.email} logged out successfully`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Enhanced logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticate, requireFreshAuth(30 * 60 * 1000), async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Invalidate all sessions for user
    const invalidated = await jwtService.invalidateAllUserSessions(userId, 'logout_all', userId);
    
    if (invalidated) {
      console.log(`All sessions invalidated for user ${req.user.email}`);
    }

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user profile with session info
router.get('/me', authenticate, detectSuspiciousActivity, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const activeSessions = await jwtService.getUserSessions(req.user._id);
    
    res.json({
      success: true,
      data: { 
        user,
        sessionInfo: {
          currentSession: req.session._id,
          totalActiveSessions: activeSessions.length,
          lastActivity: req.session.lastActivity,
          loginTime: req.session.createdAt,
          ipAddress: req.session.ipAddress,
          deviceInfo: req.session.deviceInfo
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's active sessions
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await jwtService.getUserSessions(req.user._id);
    
    // Format sessions for response (remove sensitive data)
    const formattedSessions = sessions.map(session => ({
      id: session._id,
      ipAddress: session.ipAddress,
      deviceInfo: session.deviceInfo,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session._id.toString() === req.session._id.toString()
    }));

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        total: formattedSessions.length
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Terminate specific session
router.delete('/sessions/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    // Find the session
    const session = await Session.findOne({ _id: sessionId, userId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Terminate the session
    await session.terminate('user_action', userId);

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Admin endpoint to get cleanup statistics
router.get('/admin/cleanup-stats', 
  authenticate, 
  authorize('super_admin', 'admin'), 
  async (req, res) => {
    try {
      const stats = await cleanupService.getCleanupStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get cleanup stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get cleanup statistics'
      });
    }
  }
);

// Admin endpoint to run manual cleanup
router.post('/admin/cleanup', 
  authenticate, 
  authorize('super_admin', 'admin'), 
  requireFreshAuth(15 * 60 * 1000), // Require fresh auth within 15 minutes
  async (req, res) => {
    try {
      const result = await cleanupService.runManualCleanup();
      
      res.json({
        success: true,
        message: 'Manual cleanup completed',
        data: result
      });
    } catch (error) {
      console.error('Manual cleanup error:', error);
      res.status(500).json({
        success: false,
        message: 'Manual cleanup failed',
        error: error.message
      });
    }
  }
);

export default router;