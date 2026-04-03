import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const Quotation = mongoose.model('Quotation', new mongoose.Schema({}, { strict: false }));

async function checkQuotationServices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const quotations = await Quotation.find({ status: 'approved' })
      .populate('client', 'name email phone')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📋 Found ${quotations.length} approved quotation(s)\n`);

    if (quotations.length === 0) {
      console.log('⚠️  No approved quotations found');
      process.exit(0);
    }

    quotations.forEach((q, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Quotation ${index + 1}: ${q.quotationNumber || 'NO-NUMBER'}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`Client: ${q.client?.name || q.clientName || 'N/A'}`);
      console.log(`Project: ${q.project?.name || q.projectName || 'N/A'}`);
      console.log(`Status: ${q.status}`);
      console.log(`Grand Total: ₹${(q.grandTotal || 0).toLocaleString('en-IN')}`);
      console.log(`Development Budget: ₹${(q.developmentBudget || 0).toLocaleString('en-IN')}`);
      
      console.log(`\n📦 Services (${(q.services || []).length}):`);
      if (!q.services || q.services.length === 0) {
        console.log('   ⚠️  No services found in this quotation');
      } else {
        q.services.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.serviceName || 'Unnamed Service'}`);
          console.log(`      Amount: ₹${(s.amount || 0).toLocaleString('en-IN')}`);
          if (s.service) {
            console.log(`      Service ID: ${s.service}`);
          }
        });
      }

      console.log(`\n💰 Breakdown:`);
      console.log(`   Development Budget: ₹${(q.developmentBudget || 0).toLocaleString('en-IN')}`);
      console.log(`   Services Total: ₹${(q.servicesTotal || 0).toLocaleString('en-IN')}`);
      console.log(`   Subtotal: ₹${(q.subtotal || 0).toLocaleString('en-IN')}`);
      console.log(`   CGST: ₹${(q.cgst || 0).toLocaleString('en-IN')}`);
      console.log(`   SGST: ₹${(q.sgst || 0).toLocaleString('en-IN')}`);
      console.log(`   Grand Total: ₹${(q.grandTotal || 0).toLocaleString('en-IN')}`);

      if (q.paymentTerms) {
        console.log(`\n📝 Payment Terms:`);
        console.log(`   ${q.paymentTerms.substring(0, 200)}${q.paymentTerms.length > 200 ? '...' : ''}`);
      }

      // Calculate what items would be created for invoice
      console.log(`\n🧾 Invoice Items that would be created:`);
      let itemCount = 0;
      if (q.developmentBudget > 0) {
        itemCount++;
        console.log(`   ${itemCount}. Development Budget - ₹${q.developmentBudget.toLocaleString('en-IN')}`);
      }
      if (q.services && q.services.length > 0) {
        q.services.forEach((s, i) => {
          itemCount++;
          console.log(`   ${itemCount}. ${s.serviceName} - ₹${(s.amount || 0).toLocaleString('en-IN')}`);
        });
      }
      console.log(`   Total Items: ${itemCount}`);
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ Check complete!`);
    console.log(`\nSummary:`);
    console.log(`   Total Approved Quotations: ${quotations.length}`);
    const withServices = quotations.filter(q => q.services && q.services.length > 0).length;
    const withoutServices = quotations.length - withServices;
    console.log(`   With Services: ${withServices}`);
    console.log(`   Without Services: ${withoutServices}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkQuotationServices();
