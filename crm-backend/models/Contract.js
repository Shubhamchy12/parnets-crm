import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  value: { type: Number, default: 0 },
  terms: { type: String },
  description: { type: String },
  status: { type: String, enum: ['draft', 'sent', 'signed', 'active', 'expired', 'cancelled'], default: 'draft' },
  sentAt: { type: Date },
  signedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Contract', contractSchema);
