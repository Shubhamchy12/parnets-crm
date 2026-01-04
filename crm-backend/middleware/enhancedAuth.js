import jwtService from '../services/jwtService.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import RoleConfig from '../models/RoleConfig.js';

// Enhanced authenticate middleware with session management
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate session and get user info
    const sessionResult = await jwtService.validateSession(token);
    
    if (!sessionResult.valid) {
      return res.status(401).json({
        success: false,
        message: sessionResult.error || 'Invalid or expired token'
      });
    }

    const user = sessionResult.user;
    const session = sessionResult.session;

    // Additional user status checks
    if (!user) {
      return res.status(401).json({
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

    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Add user info and session to request
    req.user = user;
    req.session = session;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Authorize user based on roles with hierarchy support
export const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin has access to everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user can manage another user based on role hierarchy
export const canManageUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin can manage anyone
    if (req.user.role === 'super_admin') {
      return next();
    }

    const targetUserId = req.params.userId || req.body.userId;
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }

    // Get target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // Check if current user can manage target user's role
    const canManage = await RoleConfig.canManageRole(req.user.role, targetUser.role);
    
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to manage this user'
      });
    }

    req.targetUser = targetUser;
    next();
  } catch (error) {
    console.error('User management authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

// Check specific module permission
export const checkModulePermission = (module) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin has access to everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user has permission for the module
    if (!req.user.permissions?.modules?.[module]) {
      return res.status(403).json({
        success: false,
        message: `Access denied to ${module} module`
      });
    }

    next();
  };
};

// Check specific action permission
export const checkActionPermission = (action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin has access to everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check if user has permission for the action
    if (!req.user.permissions?.actions?.[action]) {
      return res.status(403).json({
        success: false,
        message: `Permission denied for ${action} action`
      });
    }

    next();
  };
};

// Combined module and action permission check
export const checkPermission = (module, action) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Super admin has access to everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Check module permission
    if (!req.user.permissions?.modules?.[module]) {
      return res.status(403).json({
        success: false,
        message: `Access denied to ${module} module`
      });
    }

    // Check action permission
    if (!req.user.permissions?.actions?.[action]) {
      return res.status(403).json({
        success: false,
        message: `Permission denied for ${action} action`
      });
    }

    next();
  };
};

// Check if user owns the resource or has admin privileges
export const checkOwnership = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin roles can access any resource
    if (['super_admin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.body[resourceUserField] || req.params[resourceUserField] || req.query[resourceUserField];
    
    if (resourceUserId && resourceUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    next();
  };
};

// Enhanced rate limiting for sensitive operations with session tracking
export const rateLimitSensitive = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.user ? req.user._id : '');
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userAttempts = attempts.get(key);
    
    if (now > userAttempts.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      // Flag suspicious activity if session exists
      if (req.session) {
        req.session.flagSuspiciousActivity('multipleFailedAttempts');
      }
      
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
      });
    }

    userAttempts.count++;
    next();
  };
};

// Middleware to detect and handle suspicious activity
export const detectSuspiciousActivity = async (req, res, next) => {
  try {
    if (!req.user || !req.session) {
      return next();
    }

    const currentIP = req.ip;
    const currentUserAgent = req.get('User-Agent');

    // Check for IP address changes
    if (req.session.ipAddress !== currentIP) {
      await req.session.flagSuspiciousActivity('unusualLocation');
      console.warn(`IP address change detected for user ${req.user._id}: ${req.session.ipAddress} -> ${currentIP}`);
    }

    // Check for user agent changes (could indicate session hijacking)
    if (req.session.userAgent !== currentUserAgent) {
      await req.session.flagSuspiciousActivity('suspiciousActivity');
      console.warn(`User agent change detected for user ${req.user._id}`);
    }

    // Check for concurrent sessions
    const activeSessions = await Session.getActiveSessions(req.user._id);
    if (activeSessions.length > 3) { // Allow max 3 concurrent sessions
      await req.session.flagSuspiciousActivity('concurrentSessions');
      console.warn(`Multiple concurrent sessions detected for user ${req.user._id}: ${activeSessions.length}`);
    }

    next();
  } catch (error) {
    console.error('Error in suspicious activity detection:', error);
    next(); // Continue even if detection fails
  }
};

// Middleware to require fresh authentication for sensitive operations
export const requireFreshAuth = (maxAge = 30 * 60 * 1000) => { // 30 minutes default
  return (req, res, next) => {
    if (!req.session) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const sessionAge = Date.now() - new Date(req.session.createdAt).getTime();
    
    if (sessionAge > maxAge) {
      return res.status(401).json({
        success: false,
        message: 'Fresh authentication required for this operation',
        code: 'FRESH_AUTH_REQUIRED'
      });
    }

    next();
  };
};