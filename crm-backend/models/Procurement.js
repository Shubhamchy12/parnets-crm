import mongoose from 'mongoose';

const procurementSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  poNumber:    { type: String, trim: true },
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName:  { type: String, trim: true },
  category:    { type: String, trim: true },
  description: { type: String, trim: true },
  quantity:    { type: Number, default: 1 },
  unitPrice:   { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'delivered', 'cancelled', 'delayed'],
    default: 'pending',
  },
  orderDate:        Date,
  expectedDelivery: Date,
  requiredBy:       Date,
  notes:       { type: String, trim: true },
  project:     { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Procurement', procurementSchema);
