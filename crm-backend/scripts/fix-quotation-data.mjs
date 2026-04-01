import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm';

async function fixQuotationData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Quotation = mongoose.model('Quotation');
    const Project = mongoose.model('Project');
    const Client = mongoose.model('Client');

    console.log('📋 Fetching all quotations...\n');
    
    const quotations = await Quotation.find({})
      .populate('project')
      .populate('client')
      .lean();

    console.log(`Found ${quotations.length} quotation(s)\n`);

    let fixed = 0;

    for (const q of quotations) {
      const updates = {};
      let needsUpdate = false;

      // Fix clientName if missing
      if (!q.clientName && q.client) {
        const client = await Client.findById(q.client).lean();
        if (client && client.name) {
          updates.clientName = client.name;
          needsUpdate = true;
          console.log(`✅ Adding clientName: ${client.name} to ${q.quotationNumber}`);
        }
      }

      // Fix projectName if missing
      if (!q.projectName && q.project) {
        const project = await Project.findById(q.project).lean();
        if (project && project.name) {
          updates.projectName = project.name;
          needsUpdate = true;
          console.log(`✅ Adding projectName: ${project.name} to ${q.quotationNumber}`);
        }
      }

      if (needsUpdate) {
        await Quotation.updateOne({ _id: q._id }, { $set: updates });
        fixed++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} quotation(s)\n`);

    // Now show approved quotations
    console.log('📋 Approved Quotations:\n');
    const approved = await Quotation.find({ status: 'approved' })
      .populate('project')
      .populate('client')
      .lean();

    approved.forEach((q, i) => {
      console.log(`${i + 1}. ${q.quotationNumber}`);
      console.log(`   Client: ${q.client?.name || q.clientName || 'N/A'}`);
      console.log(`   Project: ${q.project?.name || q.projectName || 'N/A'}`);
      console.log(`   Status: ${q.status}`);
      console.log(`   Total: ₹${(q.grandTotal || 0).toLocaleString('en-IN')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixQuotationData();
