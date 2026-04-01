import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const QuotationSchema = new mongoose.Schema({}, { strict: false });
const ClientSchema = new mongoose.Schema({}, { strict: false });
const ProjectSchema = new mongoose.Schema({}, { strict: false });

const Quotation = mongoose.model('Quotation', QuotationSchema);
const Client = mongoose.model('Client', ClientSchema);
const Project = mongoose.model('Project', ProjectSchema);

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected\n');

const qs = await Quotation.find({ status: 'approved' }).lean();
console.log(`Approved quotations: ${qs.length}\n`);

for (const q of qs) {
  console.log(`--- ${q.quotationNumber} ---`);
  console.log(`  project field: ${q.project}`);
  console.log(`  client field:  ${q.client}`);

  if (q.project) {
    const proj = await Project.findById(q.project).lean();
    console.log(`  project found: ${proj ? proj.name : 'NOT FOUND'}`);
    if (proj) console.log(`  project.client: ${proj.client}`);
  }

  if (q.client) {
    const client = await Client.findById(q.client).lean();
    console.log(`  client found: ${client ? client.name : 'NOT FOUND in Client collection'}`);
  }
  console.log();
}

await mongoose.disconnect();
