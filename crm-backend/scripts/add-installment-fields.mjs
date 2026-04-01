#!/usr/bin/env node
/**
 * Migration Script: Add Installment Plan Fields to Existing Invoices
 * 
 * This script adds the new installment plan fields to existing invoices
 * that don't have them yet. It's safe to run multiple times.
 * 
 * Usage: node scripts/add-installment-fields.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/crm';

async function migrate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));

    // Find invoices without installment plan fields
    const invoices = await Invoice.find({
      $or: [
        { hasInstallmentPlan: { $exists: false } },
        { installmentPlan: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${invoices.length} invoices to update`);

    if (invoices.length === 0) {
      console.log('✨ All invoices already have installment fields');
      return;
    }

    let updated = 0;
    for (const invoice of invoices) {
      await Invoice.updateOne(
        { _id: invoice._id },
        {
          $set: {
            hasInstallmentPlan: false,
            installmentPlan: []
          }
        }
      );
      updated++;
      if (updated % 10 === 0) {
        console.log(`   Updated ${updated}/${invoices.length} invoices...`);
      }
    }

    console.log(`✅ Successfully updated ${updated} invoices`);
    console.log('');
    console.log('Migration Summary:');
    console.log(`  - Total invoices processed: ${invoices.length}`);
    console.log(`  - Invoices updated: ${updated}`);
    console.log('');
    console.log('✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrate();
