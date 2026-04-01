#!/usr/bin/env node
/**
 * Fix Installment Invoice Amounts Script
 * 
 * This script fixes installment invoices that were created with wrong amounts
 * (showing full quotation total instead of installment amount).
 * 
 * The bug: Backend was recalculating total from items instead of using
 * the provided installment amount.
 * 
 * Usage: node scripts/fix-installment-amounts.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import Invoice from '../models/Invoice.js';
import Quotation from '../models/Quotation.js';

async function fixInstallmentAmounts() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('📋 Fetching installment invoices...');
    const installmentInvoices = await Invoice.find({
      installmentNumber: { $exists: true, $ne: null },
      fromQuote: { $exists: true, $ne: null }
    }).lean();
    
    console.log(`Found ${installmentInvoices.length} installment invoices\n`);

    if (installmentInvoices.length === 0) {
      console.log('✅ No installment invoices to fix');
      return;
    }

    // Group by quotation
    const byQuotation = {};
    for (const inv of installmentInvoices) {
      const qId = String(inv.fromQuote);
      if (!byQuotation[qId]) {
        byQuotation[qId] = [];
      }
      byQuotation[qId].push(inv);
    }

    console.log(`📊 Found ${Object.keys(byQuotation).length} quotations with installments\n`);

    let fixedCount = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const [qId, invoices] of Object.entries(byQuotation)) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing Quotation: ${qId}`);
      console.log(`${'='.repeat(60)}`);

      // Fetch quotation
      const quotation = await Quotation.findById(qId).lean();
      if (!quotation) {
        console.log(`❌ Quotation not found, skipping...`);
        errors++;
        continue;
      }

      const quotationTotal = quotation.grandTotal || 0;
      console.log(`Quotation Total: ₹${quotationTotal.toLocaleString('en-IN')}`);
      console.log(`Number of Installments: ${invoices.length}`);

      // Expected amount per installment (equal split)
      const expectedPerInstallment = Math.round(quotationTotal / invoices.length);
      console.log(`Expected per installment: ₹${expectedPerInstallment.toLocaleString('en-IN')}\n`);

      // Sort by installment number
      invoices.sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));

      for (const inv of invoices) {
        const currentTotal = inv.total || 0;
        const installmentNum = inv.installmentNumber;
        
        console.log(`  Installment ${installmentNum} (${inv.invoiceNumber}):`);
        console.log(`    Current Total: ₹${currentTotal.toLocaleString('en-IN')}`);

        // Check if amount is wrong (equals full quotation total)
        if (Math.abs(currentTotal - quotationTotal) < 1) {
          console.log(`    ⚠️  WRONG! Shows full quotation amount`);
          console.log(`    🔧 Fixing to: ₹${expectedPerInstallment.toLocaleString('en-IN')}`);

          // Calculate remaining amount
          const totalPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
          const newRemaining = Math.max(0, expectedPerInstallment - totalPaid);

          // Determine status
          let newStatus = inv.status;
          if (totalPaid >= expectedPerInstallment) {
            newStatus = 'paid';
          } else if (totalPaid > 0) {
            newStatus = 'partial';
          }

          await Invoice.findByIdAndUpdate(inv._id, {
            subtotal: expectedPerInstallment,
            total: expectedPerInstallment,
            remainingAmount: newRemaining,
            status: newStatus,
          });

          console.log(`    ✅ Fixed! New remaining: ₹${newRemaining.toLocaleString('en-IN')}, Status: ${newStatus}`);
          fixedCount++;
        } else if (Math.abs(currentTotal - expectedPerInstallment) < 1) {
          console.log(`    ✓  Already correct`);
          alreadyCorrect++;
        } else {
          console.log(`    ℹ️  Custom amount: ₹${currentTotal.toLocaleString('en-IN')}`);
          alreadyCorrect++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Fixed: ${fixedCount} invoices`);
    console.log(`✓  Already correct: ${alreadyCorrect} invoices`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${installmentInvoices.length} invoices`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
    process.exit(0);
  }
}

// Run the script
fixInstallmentAmounts();
