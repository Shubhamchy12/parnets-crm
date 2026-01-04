import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  refreshExpiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  deviceInfo: {
    browser: String,
    os: String,
    device: String,
    isMobile: Boolean
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  loginMethod: {
    type: String,
    enum: ['email_otp', 'social', 'api_key'],
    default: 'email_otp'
  },
  terminatedAt: {
    type: Date
  },
  terminatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  terminationReason: {
    type: String,
    enum: ['logout', 'admin_action', 'security_violation', 'inactivity', 'token_refresh', 'password_change']
  },
  securityFlags: {
    suspiciousActivity: { type: Boolean, default: false },
    multipleFailedAttempts: { type: Boolean, default: false },
    unusualLocation: { type: Boolean, default: false },
    concurrentSessions: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes for performance and security
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ token: 1, isActive: 1 });
sessionSchema.index({ refreshToken: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ lastActivity: 1 });
sessionSchema.index({ ipAddress: 1, userId: 1 });

// Virtual to check if session is expired
sessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual to check if refresh token is expired
sessionSchema.virtual('isRefreshExpired').get(function() {
  return this.refreshExpiresAt < new Date();
});

// Virtual to check if session is valid
sessionSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired && !this.terminatedAt;
});

// Method to update last activity
sessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Method to terminate session
sessionSchema.methods.terminate = function(reason, terminatedBy = null) {
  this.isActive = false;
  this.terminatedAt = new Date();
  this.terminationReason = reason;
  if (terminatedBy) {
    this.terminatedBy = terminatedBy;
  }
  return this.save();
};

// Method to flag suspicious activity
sessionSchema.methods.flagSuspiciousActivity = function(flagType) {
  if (this.securityFlags[flagType] !== undefined) {
    this.securityFlags[flagType] = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to find active session by token
sessionSchema.statics.findActiveByToken = function(token) {
  return this.findOne({
    token,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'name email role status permissions');
};

// Static method to find active session by refresh token
sessionSchema.statics.findActiveByRefreshToken = function(refreshToken) {
  return this.findOne({
    refreshToken,
    isActive: true,
    refreshExpiresAt: { $gt: new Date() }
  }).populate('userId', 'name email role status permissions');
};

// Static method to get active sessions for user
sessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Static method to terminate all sessions for user
sessionSchema.statics.terminateAllForUser = function(userId, reason = 'admin_action', terminatedBy = null) {
  return this.updateMany(
    { userId, isActive: true },
    {
      $set: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: reason,
        terminatedBy
      }
    }
  );
};

// Static method to terminate inactive sessions
sessionSchema.statics.terminateInactiveSessions = function(inactivityThreshold = 24 * 60 * 60 * 1000) { // 24 hours
  const cutoffTime = new Date(Date.now() - inactivityThreshold);
  return this.updateMany(
    {
      isActive: true,
      lastActivity: { $lt: cutoffTime }
    },
    {
      $set: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'inactivity'
      }
    }
  );
};

// Static method to cleanup old terminated sessions
sessionSchema.statics.cleanupOldSessions = function(retentionDays = 30) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    $or: [
      { isActive: false, terminatedAt: { $lt: cutoffDate } },
      { expiresAt: { $lt: cutoffDate } }
    ]
  });
};

// Static method to detect concurrent sessions
sessionSchema.statics.detectConcurrentSessions = function(userId, maxConcurrent = 3) {
  return this.countDocuments({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).then(count => count > maxConcurrent);
};

// Static method to get session statistics
sessionSchema.statics.getSessionStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$isActive', true] }, { $gt: ['$expiresAt', new Date()] }] },
              1,
              0
            ]
          }
        },
        lastLogin: { $max: '$createdAt' },
        uniqueIPs: { $addToSet: '$ipAddress' }
      }
    },
    {
      $project: {
        _id: 0,
        totalSessions: 1,
        activeSessions: 1,
        lastLogin: 1,
        uniqueIPCount: { $size: '$uniqueIPs' }
      }
    }
  ]);
};

export default mongoose.model('Session', sessionSchema);