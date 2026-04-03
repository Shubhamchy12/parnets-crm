#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

console.log('🧪 Testing Invoice Email...\n');

// Import email service
const emailService = (await import('../services/emailService.js')).default;

// Test invoice data
const testInvoice = {
  invoiceNumber: 'INV-TEST-001',
  clientName: 'Test Client',
  createdAt: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  items: [
    {
      description: 'Web Development Services',
      qty: 1,
      rate: 50000,
    },
    {
      description: 'Mobile App Development',
      qty: 1,
      rate: 75000,
    }
  ],
  subtotal: 125000,
  tax: 22500, // 18% GST
  discount: 0,
  total: 147500,
  notes: 'Payment due within 30 days. Thank you for your business!',
  installmentLabel: 'First Installment (50%)'
};

async function testInvoiceEmail() {
  const testEmail = process.env.SMTP_USER; // Send to yourself
  
  console.log('📧 Sending test invoice email...');
  console.log(`   To: ${testEmail}\n`);

  const result = await emailService.sendInvoiceEmail(
    testEmail,
    testInvoice,
    'Test Client'
  );

  if (result.success) {
    console.log('✅ Invoice email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log('\n🎉 Check your inbox for the invoice email!');
  } else {
    console.error('❌ Failed to send invoice email');
    console.error(`   Error: ${result.error}`);
  }

  return result;
}

// Run test
testInvoiceEmail()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
