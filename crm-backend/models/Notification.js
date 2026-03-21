import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // 'project_assigned', 'progress_comment', etc.
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, // frontend route
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed }, // extra payload
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
