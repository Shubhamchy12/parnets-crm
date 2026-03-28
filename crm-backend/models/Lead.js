import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  source: { type: String },
  value: { type: Number, default: 0 },
  stage: { type: String, enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'], default: 'new' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  activities: [{
    type: { type: String, default: 'note' },
    note: String,
    by: { _id: mongoose.Schema.Types.ObjectId, name: String },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

leadSchema.index({ name: 'text', company: 'text', email: 'text' });

export default mongoose.model('Lead', leadSchema);
