import roleService from '../services/roleService.js';
import User from '../models/User.js';

/**
 * Permission checking middleware for role-based access control
 */

/**
 * Cache for role permissions to improve performance
 */
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of permissionCache.entries()) {
    if (now > value.expiry) {
      permissionCache.delete(key);
    }
  }
};

/**
 * Get cached permissions or fetch from database
 * @param {string} userRole - User's role name
 * @returns {Promise<Array>} User permissions array
 */
const getCachedPermissions = async (userRole) => {
  const cacheKey = `permissions:${userRole}`;
  const cached = permissionCache.get(cacheKey);
  
  if (cached && Date.now() < cached.expiry) {
    return cached.permissions;
  }
  
  // Fetch fresh permissions
  const permissions = await roleService.getUserPermissions(userRole);
  
  // Cache the result
  permissionCache.set(cacheKey, {
    permissions,
    expiry: Date.now() + CACHE_TTL
  });
  
  return permissions;
};

/**
 * Clear cache for a specific role (used when permissions are updated)
 * @param {string} userRole - Role name to clear from cache
 */
export const clearRoleCache = (userRole) => {
  const cacheKey = `permissions:${userRole}`;
  permissionCache.delete(cacheKey);
};

/**
 * Clear all permission cache
 */
export const clearAllCache = () => {
  permissionCache.clear();
};

/**
 * Middleware to check if user has required module permission
 * @param {string} module - Required module name
 * @returns {Function} Express middleware function
 */
export const requireModule = (module) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = await roleService.checkPermission(req.user.role, module);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required module: ${module}`,
          requiredPermission: `module:${module}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user has required action permission
 * @param {string} action - Required action name
 * @returns {Function} Express middleware function
 */
export const requireAction = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const permissions = await getCachedPermissions(req.user.role);
      const hasPermission = permissions.includes(`action:${action}`);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required action: ${action}`,
          requiredPermission: `action:${action}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user has both module and action permissions
 * @param {string} module - Required module name
 * @param {string} action - Required action name
 * @returns {Function} Express middleware function
 */
export const requirePermission = (module, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = await roleService.checkPermission(req.user.role, module, action);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required: ${module} module with ${action} action`,
          requiredPermission: `module:${module} + action:${action}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {Array} permissions - Array of permission objects {module, action}
 * @returns {Function} Express middleware function
 */
export const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      let hasAnyPermission = false;
      
      for (const permission of permissions) {
        const hasPermission = await roleService.checkPermission(
          req.user.role, 
          permission.module, 
          permission.action
        );
        
        if (hasPermission) {
          hasAnyPermission = true;
          break;
        }
      }
      
      if (!hasAnyPermission) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions',
          requiredPermissions: permissions
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if user can manage another user's role
 * @param {string} targetRoleField - Field name in request containing target role
 * @returns {Function} Express middleware function
 */
export const requireRoleManagement = (targetRoleField = 'role') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const targetRole = req.body[targetRoleField] || req.params[targetRoleField];
      
      if (!targetRole) {
        return res.status(400).json({
          success: false,
          message: `Target role not specified in ${targetRoleField}`
        });
      }

      const canManage = await roleService.canManageRole(req.user.role, targetRole);
      
      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Cannot manage role: ${targetRole}`,
          userRole: req.user.role,
          targetRole
        });
      }

      next();
    } catch (error) {
      console.error('Role management check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Role management check failed'
      });
    }
  };
};

/**
 * Middleware to check if user has admin privileges
 * @returns {Function} Express middleware function
 */
export const requireAdmin = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const adminRoles = ['super_admin', 'admin'];
      
      if (!adminRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Admin check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Admin check failed'
      });
    }
  };
};

/**
 * Middleware to check if user has super admin privileges
 * @returns {Function} Express middleware function
 */
export const requireSuperAdmin = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Super admin access required',
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Super admin check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Super admin check failed'
      });
    }
  };
};

/**
 * Middleware to attach user permissions to request object
 * @returns {Function} Express middleware function
 */
export const attachPermissions = () => {
  return async (req, res, next) => {
    try {
      if (req.user && req.user.role) {
        req.user.permissions = await getCachedPermissions(req.user.role);
        req.user.dashboardRoute = await roleService.getDashboardRoute(req.user.role);
      }
      next();
    } catch (error) {
      console.error('Attach permissions error:', error);
      // Don't fail the request, just continue without permissions
      next();
    }
  };
};

/**
 * Helper function to check permissions programmatically
 * @param {Object} user - User object with role
 * @param {string} module - Module name
 * @param {string} action - Action name (optional)
 * @returns {Promise<boolean>} Permission status
 */
export const checkUserPermission = async (user, module, action = null) => {
  try {
    if (!user || !user.role) {
      return false;
    }
    
    return await roleService.checkPermission(user.role, module, action);
  } catch (error) {
    console.error('Check user permission error:', error);
    return false;
  }
};

/**
 * Helper function to get user's dashboard route
 * @param {Object} user - User object with role
 * @returns {Promise<string>} Dashboard route
 */
export const getUserDashboardRoute = async (user) => {
  try {
    if (!user || !user.role) {
      return '/dashboard';
    }
    
    return await roleService.getDashboardRoute(user.role);
  } catch (error) {
    console.error('Get dashboard route error:', error);
    return '/dashboard';
  }
};

// Clean up expired cache entries every 10 minutes
setInterval(clearExpiredCache, 10 * 60 * 1000);

export default {
  requireModule,
  requireAction,
  requirePermission,
  requireAnyPermission,
  requireRoleManagement,
  requireAdmin,
  requireSuperAdmin,
  attachPermissions,
  checkUserPermission,
  getUserDashboardRoute,
  clearRoleCache,
  clearAllCache
};