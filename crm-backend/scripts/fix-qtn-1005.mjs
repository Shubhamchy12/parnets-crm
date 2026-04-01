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

async function fixQTN1005() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📋 Finding QTN-1005...\n');
    
    const quotation = await Quotation.findOne({ quotationNumber: 'QTN-1005' });
    
    if (!quotation) {
      console.log('❌ QTN-1005 not found');
      return;
    }

    console.log('Found QTN-1005:');
    console.log('  Current clientName:', quotation.clientName || 'EMPTY');
    console.log('  Current projectName:', quotation.projectName || 'EMPTY');
    console.log('  Client ID:', quotation.client);
    console.log('  Project ID:', quotation.project);
    console.log('');

    const updates = {};
    let needsUpdate = false;

    // Fix clientName
    if (!quotation.clientName && quotation.client) {
      const client = await Client.findById(quotation.client);
      if (client) {
        updates.clientName = client.name;
        needsUpdate = true;
        console.log(`✅ Will set clientName to: ${client.name}`);
      }
    }

    // Fix projectName
    if (!quotation.projectName && quotation.project) {
      const project = await Project.findById(quotation.project);
      if (project) {
        updates.projectName = project.name;
        needsUpdate = true;
        console.log(`✅ Will set projectName to: ${project.name}`);
      } else {
        console.log('⚠️  Project not found in database');
      }
    }

    if (needsUpdate) {
      console.log('\n🔄 Updating quotation...');
      await Quotation.updateOne({ _id: quotation._id }, { $set: updates });
      console.log('✅ Quotation updated successfully!\n');

      // Verify
      const updated = await Quotation.findById(quotation._id);
      console.log('Verification:');
      console.log('  New clientName:', updated.clientName);
      console.log('  New projectName:', updated.projectName);
    } else {
      console.log('\n⚠️  No updates needed');
    }

    console.log('\n📋 All approved quotations:');
    const approved = await Quotation.find({ status: 'approved' })
      .populate('project')
      .populate('client')
      .lean();

    approved.forEach((q, i) => {
      console.log(`\n${i + 1}. ${q.quotationNumber}`);
      console.log(`   Client: ${q.client?.name || q.clientName || 'N/A'}`);
      console.log(`   Project: ${q.project?.name || q.projectName || 'N/A'}`);
      console.log(`   Status: ${q.status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixQTN1005();
