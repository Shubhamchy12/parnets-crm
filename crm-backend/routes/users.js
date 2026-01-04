import express from 'express';
import User from '../models/User.js';
import otpService from '../services/otpService.js';
import { authenticate, rateLimitSensitive } from '../middleware/auth.js';
import { 
  requireAdmin, 
  requireSuperAdmin, 
  requirePermission, 
  requireRoleManagement,
  attachPermissions,
  clearRoleCache 
} from '../middleware/permissions.js';
import roleService from '../services/roleService.js';
import crypto from 'crypto';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.department': { $regex: search, $options: 'i' } },
        { 'profile.designation': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (status) query.status = status;

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password -otpSecret -otpExpiry')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user by ID
router.get('/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otpSecret -otpExpiry')
      .populate('createdBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new user (Admin only)
router.post('/', authenticate, requireAdmin(), requireRoleManagement('role'), rateLimitSensitive(10, 60 * 60 * 1000), async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      permissions,
      profile = {}
    } = req.body;

    // Validation
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and role are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate role exists
    try {
      await roleService.getRoleByName(role);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}`
      });
    }

    // Check if admin can manage this role
    const canManage = await roleService.canManageRole(req.user.role, role);
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: `Cannot create user with role: ${role}. Insufficient privileges.`
      });
    }

    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: tempPassword,
      role,
      status: 'active',
      createdBy: req.user._id,
      profile
    });

    // Set default permissions based on role
    user.setDefaultPermissions();

    // Override with custom permissions if provided and user has permission to set them
    if (permissions && req.user.role === 'super_admin') {
      user.permissions = {
        ...user.permissions,
        ...permissions
      };
    }

    await user.save();

    // Send welcome email with temporary password
    const emailResult = await otpService.sendWelcomeEmail(
      user.email,
      user.name,
      tempPassword,
      user.role
    );

    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
    }

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully. Welcome email sent with temporary password.',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user
router.put('/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.otpSecret;
    delete updates.otpExpiry;
    delete updates.loginAttempts;
    delete updates.lockUntil;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if admin can manage this user's role
    const canManageCurrentRole = await roleService.canManageRole(req.user.role, user.role);
    if (!canManageCurrentRole) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify this user - insufficient privileges'
      });
    }

    // If role is being changed, check if admin can manage the new role
    if (updates.role && updates.role !== user.role) {
      const canManageNewRole = await roleService.canManageRole(req.user.role, updates.role);
      if (!canManageNewRole) {
        return res.status(403).json({
          success: false,
          message: `Cannot assign role: ${updates.role}. Insufficient privileges.`
        });
      }
    }

    // Update user
    Object.assign(user, updates);
    
    // If role is changed, update permissions and clear cache
    if (updates.role && updates.role !== user.role) {
      user.setDefaultPermissions();
      clearRoleCache(user.role);
    }

    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.otpSecret;
    delete userResponse.otpExpiry;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user permissions
router.put('/:id/permissions', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: 'Permissions are required'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if admin can manage this user's role
    const canManage = await roleService.canManageRole(req.user.role, user.role);
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify permissions for this user - insufficient privileges'
      });
    }

    // Validate permissions structure
    if (!roleService.validatePermissions(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permissions structure'
      });
    }

    user.permissions = permissions;
    await user.save();

    // Clear role cache to ensure updated permissions take effect
    clearRoleCache(user.role);

    res.json({
      success: true,
      message: 'User permissions updated successfully',
      data: { permissions: user.permissions }
    });

  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset user password (Admin only)
router.post('/:id/reset-password', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if admin can manage this user's role
    const canManage = await roleService.canManageRole(req.user.role, user.role);
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Cannot reset password for this user - insufficient privileges'
      });
    }

    // Generate new temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    
    user.password = tempPassword;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Send email with new password
    const emailResult = await otpService.sendWelcomeEmail(
      user.email,
      user.name,
      tempPassword,
      user.role
    );

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
    }

    res.json({
      success: true,
      message: 'Password reset successfully. New temporary password sent via email.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Activate/Deactivate user
router.patch('/:id/status', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or suspended'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if admin can manage this user's role
    const canManage = await roleService.canManageRole(req.user.role, user.role);
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify status for this user - insufficient privileges'
      });
    }

    // Prevent deactivating self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own status'
      });
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: `User ${status === 'active' ? 'activated' : status === 'inactive' ? 'deactivated' : 'suspended'} successfully`,
      data: { status: user.status }
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user (Super Admin only)
router.delete('/:id', authenticate, requireSuperAdmin(), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Prevent deleting other super admins
    if (user.role === 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete super admin accounts'
      });
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user statistics
router.get('/stats/overview', authenticate, requireAdmin(), async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = await User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Get role statistics from role service
    const roleStats = await roleService.getRoleStatistics();

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        recentUsers,
        roleStats: stats,
        statusStats,
        roleManagement: roleStats
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get available roles for user creation
router.get('/roles/available', authenticate, requireAdmin(), async (req, res) => {
  try {
    const manageableRoles = await roleService.getManageableRoles(req.user.role);
    
    res.json({
      success: true,
      data: { roles: manageableRoles }
    });

  } catch (error) {
    console.error('Get available roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all roles (Super Admin only)
router.get('/roles/all', authenticate, requireSuperAdmin(), async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    
    res.json({
      success: true,
      data: { roles }
    });

  } catch (error) {
    console.error('Get all roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;