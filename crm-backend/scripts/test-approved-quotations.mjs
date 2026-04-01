import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm';

async function testApprovedQuotations() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const Quotation = mongoose.model('Quotation');
    const Project = mongoose.model('Project');
    const Client = mongoose.model('Client');

    console.log('📋 Fetching approved quotations...\n');
    
    const quotations = await Quotation.find({ status: 'approved' })
      .populate({ 
        path: 'project', 
        select: 'name client', 
        populate: { 
          path: 'client', 
          select: 'name email phone company address' 
        } 
      })
      .populate({ path: 'client', select: 'name email phone company address' })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`✅ Found ${quotations.length} approved quotation(s)\n`);

    if (quotations.length === 0) {
      console.log('⚠️  No approved quotations found. Please approve some quotations first.\n');
      return;
    }

    quotations.forEach((q, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Quotation ${index + 1}:`);
      console.log(`${'='.repeat(60)}`);
      
      // Quotation Number
      console.log(`📄 Quotation Number: ${q.quotationNumber || '❌ MISSING'}`);
      
      // Client Info
      let clientName = 'N/A';
      if (q.client && typeof q.client === 'object' && q.client.name) {
        clientName = q.client.name;
        console.log(`👤 Client (from quotation.client): ${clientName}`);
      } else if (q.project?.client && typeof q.project.client === 'object' && q.project.client.name) {
        clientName = q.project.client.name;
        console.log(`👤 Client (from project.client): ${clientName}`);
      } else if (q.clientName) {
        clientName = q.clientName;
        console.log(`👤 Client (from clientName field): ${clientName}`);
      } else {
        console.log(`❌ Client: MISSING`);
      }
      
      // Project Info
      let projectName = 'N/A';
      if (q.project && typeof q.project === 'object' && q.project.name) {
        projectName = q.project.name;
        console.log(`📁 Project (from quotation.project): ${projectName}`);
      } else if (q.projectName) {
        projectName = q.projectName;
        console.log(`📁 Project (from projectName field): ${projectName}`);
      } else {
        console.log(`❌ Project: MISSING`);
      }
      
      // Financial Info
      console.log(`💰 Grand Total: ₹${(q.grandTotal || 0).toLocaleString('en-IN')}`);
      console.log(`📅 Created: ${new Date(q.createdAt).toLocaleDateString('en-IN')}`);
      console.log(`✅ Status: ${q.status}`);
      
      // Dropdown Display Preview
      console.log(`\n📋 Dropdown Display:`);
      console.log(`   "${q.quotationNumber || 'N/A'} — ${clientName} | ${projectName} (₹${(q.grandTotal || 0).toLocaleString('en-IN')})"`);
    });

    console.log(`\n${'='.repeat(60)}\n`);
    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testApprovedQuotations();
