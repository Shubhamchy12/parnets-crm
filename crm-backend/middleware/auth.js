import jwtService from '../services/jwtService.js';
import User from '../models/User.js';

// In-memory user cache: userId -> { user, cachedAt }
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Role groups for convenience
export const ADMIN_ROLES = ['super_admin', 'admin'];
export const SALES_ROLES = ['super_admin', 'admin', 'sales'];
export const EMPLOYEE_ROLES = ['super_admin', 'admin', 'sales', 'employee'];

// Authenticate user with JWT token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwtService.verifyAccessToken(token);
    const userId = String(decoded.userId);

    // Check in-memory cache first
    const cached = userCache.get(userId);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
      req.user = cached.user;
      req.token = token;
      return next();
    }

    // DB lookup
    const user = await User.findById(userId).select('-password -otpSecret').lean().catch(() => null);

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status !== 'active') return res.status(401).json({ success: false, message: 'Account is not active' });
    if (user.isLocked) return res.status(401).json({ success: false, message: 'Account is temporarily locked' });

    userCache.set(userId, { user, cachedAt: Date.now() });
    req.user = user;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Authorize user based on roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    next();
  };
};

// Check specific module permission
export const checkModulePermission = (module) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (req.user.role === 'super_admin') return next();
    if (!req.user.permissions?.modules?.[module]) return res.status(403).json({ success: false, message: `Access denied to ${module} module` });
    next();
  };
};

// Check specific action permission
export const checkActionPermission = (action) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (req.user.role === 'super_admin') return next();
    if (!req.user.permissions?.actions?.[action]) return res.status(403).json({ success: false, message: `Permission denied for ${action} action` });
    next();
  };
};

// Combined module and action permission check
export const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (req.user.role === 'super_admin') return next();
    if (!req.user.permissions?.modules?.[module]) return res.status(403).json({ success: false, message: `Access denied to ${module} module` });
    if (!req.user.permissions?.actions?.[action]) return res.status(403).json({ success: false, message: `Permission denied for ${action} action` });
    next();
  };
};

// Check if user owns the resource or has admin privileges
export const checkOwnership = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    if (ADMIN_ROLES.includes(req.user.role)) return next();
    const resourceUserId = req.body[resourceUserField] || req.params[resourceUserField] || req.query[resourceUserField];
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied - insufficient permissions' });
    }
    next();
  };
};

// Clear user from cache (call after role/status changes)
export const clearUserCache = (userId) => {
  userCache.delete(String(userId));
};
