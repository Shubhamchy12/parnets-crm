import mongoose from 'mongoose';

const timelogSchema = new mongoose.Schema({
  description: { type: String },
  hours: { type: Number, required: true, min: 0 },
  date: { type: String },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  startTime: { type: Date },
  endTime: { type: Date },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Timelog', timelogSchema);
