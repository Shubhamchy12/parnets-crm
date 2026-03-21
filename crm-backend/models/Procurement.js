import mongoose from 'mongoose';

const procurementItemSchema = new mongoose.Schema({
  name: String,
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
}, { _id: false });

const procurementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  vendorName: String,
  items: [procurementItemSchema],
  totalAmount: { type: Number, default: 0 },
  requiredBy: Date,
  notes: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'ordered', 'received', 'cancelled'], default: 'pending' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Procurement', procurementSchema);
