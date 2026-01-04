import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';
import crypto from 'crypto';

class JWTService {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '1h'; // Shorter for security
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  // Generate access token
  generateAccessToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'crm-system',
      audience: 'crm-users'
    });
  }

  // Generate refresh token
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'crm-system',
      audience: 'crm-users'
    });
  }

  // Generate both tokens and create session
  async generateTokens(user, ipAddress = 'unknown', userAgent = 'unknown', deviceInfo = {}) {
    const jti = crypto.randomUUID(); // Unique token ID
    const refreshJti = crypto.randomUUID(); // Unique refresh token ID
    
    const payload = {
      jti,
      userId: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status
    };

    const refreshPayload = {
      jti: refreshJti,
      userId: user._id,
      type: 'refresh'
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(refreshPayload);

    // Calculate expiration dates
    const accessExpiresAt = new Date(Date.now() + this.parseExpiry(this.accessTokenExpiry));
    const refreshExpiresAt = new Date(Date.now() + this.parseExpiry(this.refreshTokenExpiry));

    // Create session record
    const session = await Session.create({
      userId: user._id,
      token: accessToken,
      refreshToken: refreshToken,
      expiresAt: accessExpiresAt,
      refreshExpiresAt: refreshExpiresAt,
      ipAddress,
      userAgent,
      deviceInfo,
      lastActivity: new Date()
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry,
      sessionId: session._id
    };
  }

  // Simple token generation for backward compatibility (without session management)
  generateSimpleTokens(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      status: user.status
    };

    const refreshPayload = {
      userId: user._id,
      type: 'refresh'
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(refreshPayload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry
    };
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'crm-system',
        audience: 'crm-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret, {
        issuer: 'crm-system',
        audience: 'crm-users'
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Decode token without verification (for debugging)
  decodeToken(token) {
    return jwt.decode(token);
  }

  // Check if token is expired
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  // Get token expiry time
  getTokenExpiry(token) {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch (error) {
      return null;
    }
  }

  // Extract user info from token
  extractUserInfo(token) {
    try {
      const decoded = this.verifyAccessToken(token);
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
        status: decoded.status
      };
    } catch (error) {
      return null;
    }
  }

  // Parse expiry string to milliseconds
  parseExpiry(expiry) {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000; // Default 1 hour
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken, ipAddress, userAgent) {
    try {
      // Find active session with this refresh token
      const session = await Session.findActiveByRefreshToken(refreshToken);
      
      if (!session) {
        throw new Error('Invalid or expired refresh token');
      }

      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);
      
      if (decoded.userId !== session.userId.toString()) {
        throw new Error('Token mismatch');
      }

      // Generate new access token
      const jti = crypto.randomUUID();
      const payload = {
        jti,
        userId: session.userId._id,
        email: session.userId.email,
        role: session.userId.role,
        permissions: session.userId.permissions,
        status: session.userId.status
      };

      const newAccessToken = this.generateAccessToken(payload);
      const accessExpiresAt = new Date(Date.now() + this.parseExpiry(this.accessTokenExpiry));

      // Update session with new token
      session.token = newAccessToken;
      session.expiresAt = accessExpiresAt;
      session.lastActivity = new Date();
      session.ipAddress = ipAddress;
      session.userAgent = userAgent;
      await session.save();

      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken, // Keep same refresh token
        expiresIn: this.accessTokenExpiry,
        sessionId: session._id
      };

    } catch (error) {
      throw new Error('Failed to refresh token: ' + error.message);
    }
  }

  // Invalidate session
  async invalidateSession(token, reason = 'logout', terminatedBy = null) {
    try {
      const session = await Session.findActiveByToken(token);
      if (session) {
        await session.terminate(reason, terminatedBy);
      }
      return true;
    } catch (error) {
      console.error('Error invalidating session:', error);
      return false;
    }
  }

  // Invalidate all sessions for user
  async invalidateAllUserSessions(userId, reason = 'admin_action', terminatedBy = null) {
    try {
      await Session.terminateAllForUser(userId, reason, terminatedBy);
      return true;
    } catch (error) {
      console.error('Error invalidating user sessions:', error);
      return false;
    }
  }

  // Validate session and update activity
  async validateSession(token) {
    try {
      const session = await Session.findActiveByToken(token);
      
      if (!session) {
        throw new Error('Session not found or expired');
      }

      // Update last activity
      await session.updateActivity();
      
      return {
        valid: true,
        user: session.userId,
        session: session
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Get user sessions
  async getUserSessions(userId) {
    try {
      return await Session.getActiveSessions(userId);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Cleanup inactive sessions (to be called by cron job)
  async cleanupInactiveSessions(inactivityThreshold = 24 * 60 * 60 * 1000) {
    try {
      const result = await Session.terminateInactiveSessions(inactivityThreshold);
      console.log(`Cleaned up ${result.modifiedCount} inactive sessions`);
      return result;
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
      return null;
    }
  }
}

export default new JWTService();