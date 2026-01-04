import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    select: false // Don't include in queries by default for security
  },
  hashedCode: {
    type: String,
    required: true,
    select: false // Store hashed version for security
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for automatic cleanup
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  purpose: {
    type: String,
    enum: ['login', 'password_reset', 'email_verification'],
    default: 'login'
  }
}, {
  timestamps: true
});

// Indexes for performance
otpSchema.index({ userId: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 });
otpSchema.index({ createdAt: 1 });

// Virtual to check if OTP is expired
otpSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual to check if OTP is valid (not used, not expired, attempts not exceeded)
otpSchema.virtual('isValid').get(function() {
  return !this.isUsed && !this.isExpired && this.attempts < this.maxAttempts;
});

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

// Method to mark as used
otpSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  return this.save();
};

// Static method to find valid OTP for user
otpSchema.statics.findValidOTP = function(userId, purpose = 'login') {
  return this.findOne({
    userId,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 3 }
  }).select('+hashedCode');
};

// Static method to cleanup expired OTPs (called by cron job)
otpSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true, createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Remove used OTPs older than 24 hours
    ]
  });
};

export default mongoose.model('OTP', otpSchema);