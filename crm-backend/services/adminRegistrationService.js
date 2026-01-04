import User from '../models/User.js';
import AdminRegistration from '../models/AdminRegistration.js';
import bcrypt from 'bcryptjs';

class AdminRegistrationService {
  /**
   * Check if any admin users exist in the system
   * @returns {Promise<boolean>}
   */
  async checkAdminExists() {
    try {
      const adminCount = await User.countDocuments({ 
        role: 'super_admin',
        status: 'active'
      });
      
      return adminCount > 0;
    } catch (error) {
      console.error('Error checking admin existence:', error);
      throw new Error('Failed to check admin existence');
    }
  }

  /**
   * Check if admin registration is available
   * @returns {Promise<{available: boolean, reason?: string}>}
   */
  async isRegistrationAvailable() {
    try {
      // Check if registration is already completed
      const isCompleted = await AdminRegistration.isRegistrationCompleted();
      if (isCompleted) {
        return {
          available: false,
          reason: 'Admin registration has already been completed'
        };
      }

      // Check if any admin users exist
      const adminExists = await this.checkAdminExists();
      if (adminExists) {
        return {
          available: false,
          reason: 'Admin users already exist in the system'
        };
      }

      return {
        available: true
      };
    } catch (error) {
      console.error('Error checking registration availability:', error);
      throw new Error('Failed to check registration availability');
    }
  }

  /**
   * Validate admin registration data
   * @param {Object} userData - User registration data
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validateRegistrationData(userData) {
    const errors = [];
    const { name, email, password, confirmPassword } = userData;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      // Validate email format
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
      }

      // Check if email already exists
      try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          errors.push('User with this email already exists');
        }
      } catch (error) {
        console.error('Error checking email uniqueness:', error);
        errors.push('Failed to validate email uniqueness');
      }
    }

    if (!password || password.length === 0) {
      errors.push('Password is required');
    } else {
      // Validate password strength
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      
      if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
      }
    }

    if (!confirmPassword || confirmPassword !== password) {
      errors.push('Password confirmation does not match');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Register the first admin user
   * @param {Object} userData - User registration data
   * @param {string} ipAddress - Registration IP address
   * @param {string} userAgent - Registration user agent
   * @returns {Promise<Object>}
   */
  async registerFirstAdmin(userData, ipAddress, userAgent) {
    try {
      // Check if registration is still available
      const availability = await this.isRegistrationAvailable();
      if (!availability.available) {
        throw new Error(availability.reason);
      }

      // Validate registration data
      const validation = await this.validateRegistrationData(userData);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      const { name, email, password } = userData;

      // Create the super admin user
      const adminUser = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password,
        role: 'super_admin',
        status: 'active'
      });

      // Set default permissions for super admin
      await adminUser.setDefaultPermissions();

      // Save the user
      await adminUser.save();

      // Mark registration as completed
      await AdminRegistration.completeRegistration(adminUser._id, ipAddress, userAgent);

      // Return user data without password
      const userResponse = adminUser.toObject();
      delete userResponse.password;
      delete userResponse.otpSecret;
      delete userResponse.otpExpiry;

      console.log(`✅ First admin registered successfully: ${email}`);

      return {
        success: true,
        user: userResponse,
        message: 'Admin registration completed successfully'
      };

    } catch (error) {
      console.error('Error registering first admin:', error);
      throw error;
    }
  }

  /**
   * Setup initial permissions and role configurations
   * @returns {Promise<void>}
   */
  async setupInitialPermissions() {
    try {
      // This method can be extended to set up initial role configurations
      // For now, we rely on the User model's setDefaultPermissions method
      console.log('✅ Initial permissions setup completed');
    } catch (error) {
      console.error('Error setting up initial permissions:', error);
      throw new Error('Failed to setup initial permissions');
    }
  }

  /**
   * Get registration status and information
   * @returns {Promise<Object>}
   */
  async getRegistrationStatus() {
    try {
      return await AdminRegistration.getRegistrationStatus();
    } catch (error) {
      console.error('Error getting registration status:', error);
      throw new Error('Failed to get registration status');
    }
  }
}

export default new AdminRegistrationService();