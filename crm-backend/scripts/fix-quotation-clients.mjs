/**
 * Fix quotations that have a project but missing client field.
 * Run: node scripts/fix-quotation-clients.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const QuotationSchema = new mongoose.Schema({ project: mongoose.Schema.Types.ObjectId, client: mongoose.Schema.Types.ObjectId }, { strict: false });
const ProjectSchema = new mongoose.Schema({ client: mongoose.Schema.Types.ObjectId }, { strict: false });

const Quotation = mongoose.model('Quotation', QuotationSchema);
const Project = mongoose.model('Project', ProjectSchema);

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB');

// Find quotations with project but no client
const quotations = await Quotation.find({ project: { $exists: true, $ne: null }, client: { $in: [null, undefined] } }).lean();
console.log(`Found ${quotations.length} quotations with missing client`);

let fixed = 0;
for (const q of quotations) {
  const proj = await Project.findById(q.project).lean();
  if (proj?.client) {
    await Quotation.findByIdAndUpdate(q._id, { client: proj.client });
    console.log(`Fixed quotation ${q.quotationNumber || q._id} → client: ${proj.client}`);
    fixed++;
  } else {
    console.log(`Skipped ${q.quotationNumber || q._id} — project has no client`);
  }
}

console.log(`\nDone. Fixed ${fixed}/${quotations.length} quotations.`);
await mongoose.disconnect();
