import mongoose from 'mongoose';

const serviceLineSchema = new mongoose.Schema({
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  serviceName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  quotationNumber: {
    type: String,
    unique: true,
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required'],
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client is required'],
  },
  totalBudget: {
    type: Number,
    default: 0,
    min: 0,
  },
  developmentBudget: {
    type: Number,
    default: 0,
    min: 0,
  },
  services: [serviceLineSchema],
  servicesTotal: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    default: 0,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  grandTotal: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
  paymentTerms: {
    type: String,
    trim: true,
  },
  validUntil: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'sent'],
    default: 'pending',
  },
  sentAt: Date,
  sentVia: { type: String, enum: ['email', 'whatsapp', null], default: null },
  isSent: { type: Boolean, default: false },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// Auto-generate quotation number before save
quotationSchema.pre('save', async function (next) {
  if (!this.quotationNumber) {
    const count = await mongoose.model('Quotation').countDocuments();
    this.quotationNumber = `QTN-${String(count + 1001).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('Quotation', quotationSchema);
