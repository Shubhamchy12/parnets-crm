import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const Quotation = mongoose.model('Quotation', new mongoose.Schema({
  quotationNumber: String,
  status: String,
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectName: String,
  grandTotal: Number,
  developmentBudget: Number,
  services: Array,
  subtotal: Number,
  cgst: Number,
  sgst: Number,
  paymentTerms: String,
}, { timestamps: true }));

const Client = mongoose.model('Client', new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  company: String,
  address: mongoose.Schema.Types.Mixed,
}));

const Project = mongoose.model('Project', new mongoose.Schema({
  name: String,
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
}));

async function checkApprovedQuotations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const quotations = await Quotation.find({ status: 'approved' })
      .populate({ path: 'project', select: 'name client', populate: { path: 'client', select: 'name email phone company address' } })
      .populate({ path: 'client', select: 'name email phone company address' })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`\n📊 Found ${quotations.length} approved quotation(s)\n`);

    if (quotations.length === 0) {
      console.log('⚠️  No approved quotations found!');
      console.log('   Please approve a quotation first.');
      
      // Check if there are any quotations at all
      const allQuotations = await Quotation.find().select('quotationNumber status').lean();
      console.log(`\n📋 Total quotations in database: ${allQuotations.length}`);
      if (allQuotations.length > 0) {
        console.log('\nQuotation statuses:');
        allQuotations.forEach(q => {
          console.log(`   - ${q.quotationNumber}: ${q.status}`);
        });
      }
    } else {
      quotations.forEach((q, i) => {
        console.log(`\n${i + 1}. ${q.quotationNumber || 'NO-NUMBER'}`);
        console.log(`   Status: ${q.status}`);
        console.log(`   Client: ${q.client?.name || q.clientName || 'N/A'}`);
        console.log(`   Project: ${q.project?.name || q.projectName || 'N/A'}`);
        console.log(`   Grand Total: ₹${q.grandTotal || 0}`);
        console.log(`   Development Budget: ₹${q.developmentBudget || 0}`);
        console.log(`   Services: ${q.services?.length || 0} items`);
        console.log(`   Payment Terms: ${q.paymentTerms ? 'Yes' : 'No'}`);
        console.log(`   Created: ${q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkApprovedQuotations();
