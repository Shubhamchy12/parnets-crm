import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { 
  requireAdmin, 
  requireSuperAdmin, 
  requirePermission,
  clearRoleCache,
  clearAllCache 
} from '../middleware/permissions.js';
import roleService from '../services/roleService.js';
import User from '../models/User.js';

const router = express.Router();

// Get all roles with optional hierarchy filtering
router.get('/', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { maxHierarchy } = req.query;
    const roles = await roleService.getAllRoles(maxHierarchy ? parseInt(maxHierarchy) : null);
    
    res.json({
      success: true,
      data: { roles }
    });

  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get role by name
router.get('/:roleName', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { roleName } = req.params;
    const role = await roleService.getRoleByName(roleName);
    
    res.json({
      success: true,
      data: { role }
    });

  } catch (error) {
    console.error('Get role error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new custom role (Super Admin only)
router.post('/', authenticate, requireSuperAdmin(), async (req, res) => {
  try {
    const roleData = req.body;
    
    // Validate required fields
    if (!roleData.roleName || !roleData.displayName || !roleData.description) {
      return res.status(400).json({
        success: false,
        message: 'Role name, display name, and description are required'
      });
    }

    // Validate permissions structure if provided
    if (roleData.permissions && !roleService.validatePermissions(roleData.permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permissions structure'
      });
    }

    const newRole = await roleService.createRole(roleData, req.user._id);
    
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role: newRole }
    });

  } catch (error) {
    console.error('Create role error:', error);
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update role permissions
router.put('/:roleName', authenticate, requireSuperAdmin(), async (req, res) => {
  try {
    const { roleName } = req.params;
    const updateData = req.body;

    // Validate permissions structure if provided
    if (updateData.permissions && !roleService.validatePermissions(updateData.permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permissions structure'
      });
    }

    const updatedRole = await roleService.updateRole(roleName, updateData, req.user._id);
    
    // Clear cache for this role to ensure changes take effect
    clearRoleCache(roleName);
    
    res.json({
      success: true,
      message: 'Role updated successfully',
      data: { role: updatedRole }
    });

  } catch (error) {
    console.error('Update role error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('Cannot modify')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete custom role (Super Admin only)
router.delete('/:roleName', authenticate, requireSuperAdmin(), async (req, res) => {
  try {
    const { roleName } = req.params;
    
    await roleService.deleteRole(roleName);
    
    // Clear cache for this role
    clearRoleCache(roleName);
    
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get roles that current user can manage
router.get('/manageable/list', authenticate, requireAdmin(), async (req, res) => {
  try {
    const manageableRoles = await roleService.getManageableRoles(req.user.role);
    
    res.json({
      success: true,
      data: { roles: manageableRoles }
    });

  } catch (error) {
    console.error('Get manageable roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check if user can manage a specific role
router.get('/can-manage/:targetRole', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { targetRole } = req.params;
    const canManage = await roleService.canManageRole(req.user.role, targetRole);
    
    res.json({
      success: true,
      data: { 
        canManage,
        userRole: req.user.role,
        targetRole
      }
    });

  } catch (error) {
    console.error('Check role management error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get role statistics
router.get('/stats/overview', authenticate, requireAdmin(), async (req, res) => {
  try {
    const stats = await roleService.getRoleStatistics();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get role statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check user permissions
router.post('/check-permission', authenticate, async (req, res) => {
  try {
    const { module, action } = req.body;
    
    if (!module) {
      return res.status(400).json({
        success: false,
        message: 'Module is required'
      });
    }

    const hasPermission = await roleService.checkPermission(req.user.role, module, action);
    
    res.json({
      success: true,
      data: { 
        hasPermission,
        userRole: req.user.role,
        module,
        action: action || 'any'
      }
    });

  } catch (error) {
    console.error('Check permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's permissions
router.get('/permissions/my', authenticate, async (req, res) => {
  try {
    const permissions = await roleService.getUserPermissions(req.user.role);
    const dashboardRoute = await roleService.getDashboardRoute(req.user.role);
    
    res.json({
      success: true,
      data: { 
        permissions,
        dashboardRoute,
        role: req.user.role
      }
    });

  } catch (error) {
    console.error('Get user permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get permissions for a specific role (Admin only)
router.get('/permissions/:roleName', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { roleName } = req.params;
    
    // Check if admin can view this role's permissions
    const canManage = await roleService.canManageRole(req.user.role, roleName);
    if (!canManage && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot view permissions for this role - insufficient privileges'
      });
    }

    const permissions = await roleService.getUserPermissions(roleName);
    const dashboardRoute = await roleService.getDashboardRoute(roleName);
    
    res.json({
      success: true,
      data: { 
        permissions,
        dashboardRoute,
        role: roleName
      }
    });

  } catch (error) {
    console.error('Get role permissions error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bulk update permissions for multiple users (Super Admin only)
router.post('/permissions/bulk-update', authenticate, requireSuperAdmin(), async (req, res) => {
  try {
    const { userIds, permissions } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!permissions) {
      return res.status(400).json({
        success: false,
        message: 'Permissions are required'
      });
    }

    // Validate permissions structure
    if (!roleService.validatePermissions(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permissions structure'
      });
    }

    // Update permissions for all specified users
    const updateResult = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { permissions } }
    );

    // Clear all role cache to ensure changes take effect
    clearAllCache();

    res.json({
      success: true,
      message: `Permissions updated for ${updateResult.modifiedCount} users`,
      data: { 
        modifiedCount: updateResult.modifiedCount,
        permissions 
      }
    });

  } catch (error) {
    console.error('Bulk update permissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Clear permission cache (Super Admin only)
router.post('/cache/clear', authenticate, requireSuperAdmin(), async (req, res) => {
  try {
    const { roleName } = req.body;
    
    if (roleName) {
      clearRoleCache(roleName);
      res.json({
        success: true,
        message: `Cache cleared for role: ${roleName}`
      });
    } else {
      clearAllCache();
      res.json({
        success: true,
        message: 'All permission cache cleared'
      });
    }

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;