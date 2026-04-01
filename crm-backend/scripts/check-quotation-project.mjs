import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import Quotation from '../models/Quotation.js';
import Project from '../models/Project.js';

async function checkQuotationProject() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const quotation = await Quotation.findOne({ quotationNumber: 'QTN-1005' }).lean();
    
    console.log('\n📋 Quotation Details:');
    console.log(`   Number: ${quotation.quotationNumber}`);
    console.log(`   Client ID: ${quotation.client}`);
    console.log(`   Client Name: ${quotation.clientName}`);
    console.log(`   Project ID: ${quotation.project}`);
    console.log(`   Project Name: ${quotation.projectName}`);

    if (quotation.project) {
      const project = await Project.findById(quotation.project).lean();
      if (project) {
        console.log('\n📁 Project Found:');
        console.log(`   Name: ${project.name}`);
        console.log(`   Client: ${project.client}`);
        
        // Update quotation with project name
        await Quotation.updateOne(
          { _id: quotation._id },
          { $set: { projectName: project.name } }
        );
        console.log('\n✅ Updated quotation with project name');
      } else {
        console.log('\n⚠️  Project not found in database');
      }
    } else {
      console.log('\n⚠️  No project ID in quotation');
      
      // List all projects
      const projects = await Project.find({}).limit(5).lean();
      console.log(`\n📁 Available Projects (${projects.length}):`);
      projects.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (ID: ${p._id})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkQuotationProject();
