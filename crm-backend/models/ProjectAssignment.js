import mongoose from 'mongoose';

const projectAssignmentSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedDate: { type: Date, default: Date.now },
  note: { type: String, trim: true },
  status: { type: String, enum: ['active', 'removed'], default: 'active' },
}, { timestamps: true });

projectAssignmentSchema.index({ project: 1, employee: 1 });

export default mongoose.model('ProjectAssignment', projectAssignmentSchema);
