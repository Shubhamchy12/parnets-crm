import express from 'express';
import adminRegistrationService from '../services/adminRegistrationService.js';
import { rateLimitSensitive } from '../middleware/auth.js';

const router = express.Router();

// Check if admin registration is available
router.get('/admin-registration-available', async (req, res) => {
  try {
    const availability = await adminRegistrationService.isRegistrationAvailable();
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error checking admin registration availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check registration availability'
    });
  }
});

// Register first admin user
router.post('/register-admin', 
  rateLimitSensitive(5, 60 * 60 * 1000), // 5 attempts per hour
  async (req, res) => {
    try {
      const { name, email, password, confirmPassword } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent') || 'Unknown';

      // Validate required fields
      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      // Register the first admin
      const result = await adminRegistrationService.registerFirstAdmin(
        { name, email, password, confirmPassword },
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user
        }
      });

    } catch (error) {
      console.error('Error registering admin:', error);
      
      // Handle specific error types
      if (error.message.includes('already exists') || 
          error.message.includes('already been completed') ||
          error.message.includes('already exist')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('required') || 
          error.message.includes('valid') ||
          error.message.includes('match')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to register admin user'
      });
    }
  }
);

// Get registration status (for debugging/admin purposes)
router.get('/registration-status', async (req, res) => {
  try {
    const status = await adminRegistrationService.getRegistrationStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get registration status'
    });
  }
});

export default router;