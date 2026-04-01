import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const quotationSchema = new mongoose.Schema({
  quotationNumber: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  projectName: String,
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  clientName: String,
  status: String,
  grandTotal: Number,
  services: Array,
  developmentBudget: Number,
}, { timestamps: true });

const Quotation = mongoose.model('Quotation', quotationSchema);

async function approveFirstQuotation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find first pending quotation (without populate to avoid schema issues)
    const quotation = await Quotation.findOne({ status: 'pending' }).lean();

    if (!quotation) {
      console.log('⚠️  No pending quotations found to approve');
      await mongoose.disconnect();
      return;
    }

    console.log('\n📋 Found Quotation:');
    console.log(`   Number: ${quotation.quotationNumber}`);
    console.log(`   Client: ${quotation.clientName || 'No Client'}`);
    console.log(`   Project: ${quotation.projectName || 'No Project'}`);
    console.log(`   Current Status: ${quotation.status}`);
    console.log(`   Grand Total: ₹${quotation.grandTotal || 0}`);

    // Approve it
    await Quotation.updateOne(
      { _id: quotation._id },
      { $set: { status: 'approved' } }
    );

    console.log('\n✅ Quotation approved successfully!');
    console.log('   New Status: approved');
    console.log('\n💡 Now you can create invoices from this quotation');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

approveFirstQuotation();
