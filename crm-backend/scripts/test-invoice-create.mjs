import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected\n');

const db = mongoose.connection.db;

// Get a real quotation, client, project
const quotation = await db.collection('quotations').findOne({ status: 'approved' });
const client = await db.collection('clients').findOne({});
const project = await db.collection('projects').findOne({});

console.log('Test quotation:', quotation?.quotationNumber, quotation?._id);
console.log('Client:', client?.name, client?._id);
console.log('Project:', project?.name, project?._id);

// Simulate what InvoiceBuilder sends
const payload = {
  client: client?._id?.toString(),
  clientName: client?.name || '',
  clientAddress: '',
  clientPhone: '',
  project: project?._id?.toString(),
  projectName: project?.name || '',
  fromQuote: quotation?._id?.toString(),
  quotationNumber: quotation?.quotationNumber,
  installmentNumber: 1,
  installmentLabel: '1st Installment',
  description: '1st Installment',
  items: [{ description: 'Development Budget', qty: 1, rate: 500000 }],
  subtotal: 500000,
  tax: 0,
  discount: 0,
  total: 500000,
  budget: quotation?.grandTotal || 0,
  paidAmount: 0,
  totalPaidSoFar: 0,
  remainingAmount: quotation?.grandTotal || 0,
  dueDate: undefined,
  notes: '',
};

console.log('\nPayload to send:', JSON.stringify(payload, null, 2));

// Try creating invoice directly
const Invoice = (await import('../models/Invoice.js')).default;

try {
  const invoiceNumber = await Invoice.generateInvoiceNumber();
  console.log('\nGenerated invoice number:', invoiceNumber);

  const invoice = await Invoice.create({
    invoiceNumber,
    client: payload.client || undefined,
    clientName: payload.clientName,
    clientAddress: payload.clientAddress,
    clientPhone: payload.clientPhone,
    project: payload.project || undefined,
    projectName: payload.projectName,
    fromQuote: payload.fromQuote || undefined,
    quotationNumber: payload.quotationNumber,
    items: payload.items,
    subtotal: payload.subtotal,
    tax: 0,
    discount: 0,
    total: payload.total,
    budget: payload.budget,
    paidAmount: 0,
    totalPaidSoFar: 0,
    remainingAmount: payload.remainingAmount,
    installmentNumber: 1,
    installmentLabel: '1st Installment',
    description: '1st Installment',
    dueDate: undefined,
    notes: '',
    status: 'draft',
    payments: [],
    createdBy: new mongoose.Types.ObjectId(),
  });

  console.log('\n✅ Invoice created successfully:', invoice.invoiceNumber, invoice._id);

  // Clean up
  await Invoice.findByIdAndDelete(invoice._id);
  console.log('Cleaned up test invoice');
} catch (e) {
  console.error('\n❌ Invoice create FAILED:');
  console.error('Message:', e.message);
  console.error('Code:', e.code);
  if (e.errors) {
    Object.entries(e.errors).forEach(([k, v]) => console.error(`  Field "${k}":`, v.message));
  }
}

await mongoose.disconnect();
