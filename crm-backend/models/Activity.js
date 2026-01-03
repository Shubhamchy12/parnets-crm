import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true
  },
  entity: {
    type: String,
    enum: ['user', 'client', 'project', 'attendance', 'payment', 'invoice', 'support_ticket', 'system'],
    required: [true, 'Entity is required']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  }
}, {
  timestamps: true
});

// Index for efficient querying
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ entity: 1, entityId: 1 });
activitySchema.index({ createdAt: -1 });

export default mongoose.model('Activity', activitySchema);