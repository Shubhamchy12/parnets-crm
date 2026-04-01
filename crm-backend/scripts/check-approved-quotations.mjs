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

async function checkApprovedQuotations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check all quotations
    const allQuotations = await Quotation.find({}).lean();
    console.log(`\n📊 Total Quotations: ${allQuotations.length}`);

    // Group by status
    const byStatus = {};
    allQuotations.forEach(q => {
      const status = q.status || 'undefined';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    console.log('\n📈 Quotations by Status:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Check approved quotations
    const approvedQuotations = await Quotation.find({ status: 'approved' })
      .populate('project', 'name')
      .populate('client', 'name email phone')
      .lean();

    console.log(`\n✅ Approved Quotations: ${approvedQuotations.length}`);

    if (approvedQuotations.length > 0) {
      console.log('\n📋 Approved Quotations Details:');
      approvedQuotations.forEach((q, i) => {
        console.log(`\n${i + 1}. ${q.quotationNumber || 'No Number'}`);
        console.log(`   Client: ${q.client?.name || q.clientName || 'No Client'}`);
        console.log(`   Project: ${q.project?.name || q.projectName || 'No Project'}`);
        console.log(`   Grand Total: ₹${q.grandTotal || 0}`);
        console.log(`   Status: ${q.status}`);
        console.log(`   Created: ${q.createdAt}`);
      });
    } else {
      console.log('\n⚠️  No approved quotations found!');
      console.log('\n💡 To fix this, you need to:');
      console.log('   1. Go to Quotations page');
      console.log('   2. Select a quotation');
      console.log('   3. Change its status to "approved"');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkApprovedQuotations();
