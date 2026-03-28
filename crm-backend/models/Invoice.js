import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, default: 'bank_transfer' },
  date: { type: Date, default: Date.now },
  reference: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: true });

const itemSchema = new mongoose.Schema({
  description: String,
  qty: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName: String,
  clientAddress: String,
  clientPhone: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectName: String,
  fromQuote: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  quotationNumber: String,
  items: [itemSchema],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  budget: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  totalPaidSoFar: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  installmentNumber: Number,
  installmentLabel: String,
  description: String,
  dueDate: Date,
  notes: String,
  status: { type: String, enum: ['draft', 'sent', 'paid', 'partial', 'overdue'], default: 'draft' },
  payments: [paymentSchema],
  sentAt: Date,
  sentVia: { type: String, enum: ['email', 'whatsapp', null], default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

invoiceSchema.statics.generateInvoiceNumber = async function () {
  const MAX_RETRIES = 10;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const last = await this.findOne(
      { invoiceNumber: { $regex: /^INV-\d+$/ } },
      { invoiceNumber: 1 },
      { sort: { invoiceNumber: -1 } }
    ).lean();

    const lastNum = last
      ? parseInt(last.invoiceNumber.replace('INV-', ''), 10)
      : 1000;

    const candidate = `INV-${String(lastNum + 1).padStart(4, '0')}`;

    const exists = await this.exists({ invoiceNumber: candidate });
    if (!exists) return candidate;
  }
  return `INV-${Date.now()}`;
};

export default mongoose.model('Invoice', invoiceSchema);
