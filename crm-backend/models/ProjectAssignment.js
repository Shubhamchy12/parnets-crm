import mongoose from 'mongoose';

const developerFeedbackSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  text: { type: String, trim: true },
}, { _id: false });

const dayWisePlanSchema = new mongoose.Schema({
  dateFrom:          { type: Date, required: true },
  dateTo:            { type: Date },
  taskDescription:   { type: String, trim: true, required: true },
  status:            { type: String, enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], default: 'pending' },
  developerRemark:   { type: String, trim: true },
  updatedAt:         { type: Date },
}, { _id: true });

const workPlanSchema = new mongoose.Schema({
  dayWiseWork:       { type: String, trim: true },
  status:            { type: String, enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], default: 'pending' },
  taskDescription:   { type: String, trim: true },
  developerFeedback: { type: [developerFeedbackSchema], default: [] },
  remark:            { type: String, trim: true },
  dayWisePlans:      { type: [dayWisePlanSchema], default: [] },
}, { _id: false });

const projectAssignmentSchema = new mongoose.Schema({
  project:      { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  assignedDate: { type: Date, default: Date.now },
  note:         { type: String, trim: true },
  workPlan:     { type: workPlanSchema, default: null },
  status:       { type: String, enum: ['active', 'removed'], default: 'active' },
}, { timestamps: true });

projectAssignmentSchema.index({ project: 1, employee: 1 });

export default mongoose.model('ProjectAssignment', projectAssignmentSchema);
