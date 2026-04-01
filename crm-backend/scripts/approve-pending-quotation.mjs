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

async function approvePendingQuotation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the pending quotation
    const quotation = await Quotation.findOne({ quotationNumber: 'QTN-1001' });
    
    if (!quotation) {
      console.log('❌ Quotation QTN-1001 not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n📋 Found quotation: ${quotation.quotationNumber}`);
    console.log(`   Current status: ${quotation.status}`);

    // Approve it
    quotation.status = 'approved';
    await quotation.save();

    console.log(`✅ Quotation ${quotation.quotationNumber} has been approved!`);
    console.log(`   New status: ${quotation.status}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

approvePendingQuotation();
