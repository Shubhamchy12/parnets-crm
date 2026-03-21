import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, trim: true },
  reference: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
