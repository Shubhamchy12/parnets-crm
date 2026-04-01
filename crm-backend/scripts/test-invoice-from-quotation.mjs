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

async function testInvoiceFromQuotation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🧪 Testing Invoice from Approved Quotation Flow\n');
    console.log('='.repeat(60));

    // Step 1: Fetch approved quotations (simulating the API call)
    console.log('\n📋 Step 1: Fetching approved quotations...');
    const quotations = await Quotation.find({ status: 'approved' })
      .populate({ 
        path: 'project', 
        select: 'name client', 
        populate: { path: 'client', select: 'name email phone company address' } 
      })
      .populate({ path: 'client', select: 'name email phone company address' })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`   ✅ Found ${quotations.length} approved quotation(s)`);

    if (quotations.length === 0) {
      console.log('\n❌ TEST FAILED: No approved quotations found!');
      console.log('   Please approve a quotation first.');
      await mongoose.disconnect();
      return;
    }

    // Step 2: Process first quotation (simulating frontend logic)
    console.log('\n📊 Step 2: Processing quotation data...');
    const q = quotations[0];

    // Resolve client
    let client = null;
    if (q.client && typeof q.client === 'object' && q.client.name) {
      client = q.client;
    } else if (q.project?.client && typeof q.project.client === 'object' && q.project.client.name) {
      client = q.project.client;
    } else if (q.clientName) {
      client = { name: q.clientName };
    }

    // Resolve project
    let project = null;
    if (q.project && typeof q.project === 'object' && q.project.name) {
      project = { _id: q.project._id, name: q.project.name };
    } else if (q.projectName) {
      project = { name: q.projectName };
    }

    console.log('\n   Quotation Details:');
    console.log('   ' + '-'.repeat(50));
    console.log(`   Quotation Number: ${q.quotationNumber || 'N/A'}`);
    console.log(`   Status: ${q.status}`);
    console.log(`   Client: ${client?.name || 'N/A'}`);
    console.log(`   Project: ${project?.name || 'N/A'}`);
    console.log(`   Grand Total: ₹${q.grandTotal?.toLocaleString('en-IN') || 0}`);
    console.log(`   Development Budget: ₹${q.developmentBudget?.toLocaleString('en-IN') || 0}`);
    console.log(`   Services: ${q.services?.length || 0} items`);

    // Step 3: Build invoice items (simulating frontend logic)
    console.log('\n📝 Step 3: Building invoice items...');
    const lineItems = [];
    
    if (q.developmentBudget > 0) {
      lineItems.push({ 
        description: 'Development Budget', 
        qty: 1, 
        rate: q.developmentBudget 
      });
      console.log(`   ✅ Added: Development Budget - ₹${q.developmentBudget.toLocaleString('en-IN')}`);
    }
    
    (q.services || []).forEach((s, i) => {
      lineItems.push({
        description: s.serviceName,
        qty: 1,
        rate: Number(s.amount) || 0,
      });
      console.log(`   ✅ Added: ${s.serviceName} - ₹${(Number(s.amount) || 0).toLocaleString('en-IN')}`);
    });

    console.log(`\n   Total Items: ${lineItems.length}`);
    const itemsTotal = lineItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    console.log(`   Items Total: ₹${itemsTotal.toLocaleString('en-IN')}`);

    // Step 4: Validate data completeness
    console.log('\n✅ Step 4: Validating data completeness...');
    const validations = [
      { check: !!q.quotationNumber, label: 'Quotation Number', value: q.quotationNumber },
      { check: !!client, label: 'Client Info', value: client?.name },
      { check: !!project, label: 'Project Info', value: project?.name },
      { check: q.grandTotal > 0, label: 'Grand Total', value: `₹${q.grandTotal?.toLocaleString('en-IN')}` },
      { check: lineItems.length > 0, label: 'Invoice Items', value: `${lineItems.length} items` },
      { check: itemsTotal === q.grandTotal, label: 'Total Match', value: itemsTotal === q.grandTotal ? 'Yes' : 'No' },
    ];

    let allValid = true;
    validations.forEach(v => {
      const status = v.check ? '✅' : '❌';
      console.log(`   ${status} ${v.label}: ${v.value || 'Missing'}`);
      if (!v.check) allValid = false;
    });

    // Step 5: Test result
    console.log('\n' + '='.repeat(60));
    if (allValid) {
      console.log('\n🎉 TEST PASSED: All data is complete and ready for invoice creation!');
      console.log('\n📋 Summary:');
      console.log(`   - Quotation: ${q.quotationNumber}`);
      console.log(`   - Client: ${client?.name}`);
      console.log(`   - Project: ${project?.name}`);
      console.log(`   - Total: ₹${q.grandTotal?.toLocaleString('en-IN')}`);
      console.log(`   - Items: ${lineItems.length}`);
      console.log('\n✅ You can now create invoices from this quotation in the UI.');
    } else {
      console.log('\n⚠️  TEST WARNING: Some data is missing or incomplete.');
      console.log('   The invoice can still be created, but some fields may show as "N/A".');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('\n❌ TEST FAILED with error:', error);
    process.exit(1);
  }
}

testInvoiceFromQuotation();
