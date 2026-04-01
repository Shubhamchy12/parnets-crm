import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

// Import actual models
import Quotation from '../models/Quotation.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';

async function fixApprovedQuotationData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find approved quotations
    const quotations = await Quotation.find({ status: 'approved' });

    console.log(`\n📊 Found ${quotations.length} approved quotation(s)`);

    for (const q of quotations) {
      console.log(`\n📋 Processing: ${q.quotationNumber}`);
      
      let updated = false;

      // Fix client name
      if (q.client && !q.clientName) {
        const client = await Client.findById(q.client).lean();
        if (client) {
          q.clientName = client.name;
          console.log(`   ✅ Set clientName: ${client.name}`);
          updated = true;
        }
      }

      // Fix project name
      if (q.project && !q.projectName) {
        const project = await Project.findById(q.project).lean();
        if (project) {
          q.projectName = project.name;
          console.log(`   ✅ Set projectName: ${project.name}`);
          updated = true;
        }
      }

      if (updated) {
        await q.save();
        console.log(`   💾 Saved changes`);
      } else {
        console.log(`   ℹ️  No changes needed`);
      }
    }

    console.log('\n✅ All approved quotations processed');

    // Show final state
    const finalQuotations = await Quotation.find({ status: 'approved' })
      .populate('client', 'name email phone company address')
      .populate('project', 'name')
      .lean();

    console.log('\n📋 Final Approved Quotations:');
    finalQuotations.forEach((q, i) => {
      console.log(`\n${i + 1}. ${q.quotationNumber}`);
      console.log(`   Client: ${q.client?.name || q.clientName || 'No Client'}`);
      console.log(`   Project: ${q.project?.name || q.projectName || 'No Project'}`);
      console.log(`   Grand Total: ₹${q.grandTotal || 0}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

fixApprovedQuotationData();
