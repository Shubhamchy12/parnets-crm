#!/usr/bin/env node
/**
 * Fix Invoice Amounts Script
 * 
 * This script corrects invoice payment calculations that may have been
 * incorrectly calculated using budget instead of invoice total.
 * 
 * Usage: node scripts/fix-invoice-amounts.mjs
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

async function fixInvoiceAmounts() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('📋 Fetching all invoices...');
    const invoices = await Invoice.find({}).lean();
    console.log(`Found ${invoices.length} invoices\n`);

    let fixedCount = 0;
    let alreadyCorrect = 0;

    for (const inv of invoices) {
      const totalPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
      const correctRemaining = Math.max(0, (inv.total || 0) - totalPaid);
      const currentRemaining = inv.remainingAmount || 0;

      // Determine correct status
      let correctStatus = inv.status;
      if (totalPaid >= inv.total) {
        correctStatus = 'paid';
      } else if (totalPaid > 0) {
        correctStatus = 'partial';
      } else if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
        correctStatus = 'overdue';
      }

      const needsFix = 
        Math.abs(currentRemaining - correctRemaining) > 0.01 ||
        inv.paidAmount !== totalPaid ||
        inv.status !== correctStatus;

      if (needsFix) {
        console.log(`🔧 Fixing ${inv.invoiceNumber}:`);
        console.log(`   Total: ${inv.total}`);
        console.log(`   Paid: ${inv.paidAmount} → ${totalPaid}`);
        console.log(`   Remaining: ${currentRemaining} → ${correctRemaining}`);
        console.log(`   Status: ${inv.status} → ${correctStatus}`);

        await Invoice.findByIdAndUpdate(inv._id, {
          paidAmount: totalPaid,
          remainingAmount: correctRemaining,
          status: correctStatus,
        });

        fixedCount++;
      } else {
        alreadyCorrect++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Fixed: ${fixedCount} invoices`);
    console.log(`✓  Already correct: ${alreadyCorrect} invoices`);
    console.log(`📊 Total processed: ${invoices.length} invoices`);
    console.log('='.repeat(50));

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
fixInvoiceAmounts();
