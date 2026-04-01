import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Quotation from '../models/Quotation.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function linkQuotationToProject() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find QTN-1005
    const quotation = await Quotation.findOne({ quotationNumber: 'QTN-1005' });
    if (!quotation) {
      console.log('❌ QTN-1005 not found');
      return;
    }

    console.log('Found QTN-1005:');
    console.log(`  Current Project ID: ${quotation.project}`);
    console.log(`  Current Project Name: ${quotation.projectName || 'EMPTY'}`);
    console.log('');

    // Find Labor Link project
    const project = await Project.findOne({ name: 'Labor Link' }).populate('client');
    if (!project) {
      console.log('❌ Labor Link project not found');
      return;
    }

    console.log('Found Labor Link project:');
    console.log(`  Project ID: ${project._id}`);
    console.log(`  Project Name: ${project.name}`);
    console.log(`  Client: ${project.client?.name || 'N/A'}`);
    console.log('');

    // Update quotation
    console.log('🔄 Updating QTN-1005...');
    await Quotation.updateOne(
      { _id: quotation._id },
      {
        $set: {
          project: project._id,
          projectName: project.name,
          client: project.client._id,
          clientName: project.client.name
        }
      }
    );

    console.log('✅ Quotation updated successfully!\n');

    // Verify
    const updated = await Quotation.findById(quotation._id);
    console.log('Verification:');
    console.log(`  New Project ID: ${updated.project}`);
    console.log(`  New Project Name: ${updated.projectName}`);
    console.log(`  New Client Name: ${updated.clientName}`);
    console.log('');

    // Test API response
    console.log('📋 Testing API response format:');
    const testQuotation = await Quotation.findById(quotation._id)
      .populate('project')
      .populate('client')
      .lean();

    const clientName = testQuotation.client?.name || testQuotation.clientName || 'No Client';
    const projectName = testQuotation.project?.name || testQuotation.projectName || 'No Project';
    
    console.log(`Dropdown will show: ${testQuotation.quotationNumber} — ${clientName} | ${projectName}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

linkQuotationToProject();
