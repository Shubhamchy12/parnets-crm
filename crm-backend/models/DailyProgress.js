import mongoose from 'mongoose';

const dailyProgressSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  workDone: { type: String, required: true, trim: true },
  hoursSpent: { type: Number, min: 0, max: 24, required: true },
  completionPercentage: { type: Number, min: 0, max: 100, required: true },
  blockers: { type: String, trim: true },
  files: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
  statusUpdate: {
    type: String,
    enum: ['on_track', 'delayed', 'blocked', 'completed'],
    default: 'on_track',
  },
  adminComment: { type: String, trim: true },
  adminCommentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminCommentAt: { type: Date },
}, { timestamps: true });

// One entry per employee per project per day
dailyProgressSchema.index({ project: 1, employee: 1, date: 1 }, { unique: true });

export default mongoose.model('DailyProgress', dailyProgressSchema);
