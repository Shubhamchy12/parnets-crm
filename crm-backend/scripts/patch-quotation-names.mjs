/**
 * Patch existing quotations with clientName and projectName string fields.
 * For records where project/client documents are deleted, we store the name directly.
 * Run: node crm-backend/scripts/patch-quotation-names.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
console.log('Connected to MongoDB\n');

const db = mongoose.connection.db;
const quotations = await db.collection('quotations').find({}).toArray();
const projects = await db.collection('projects').find({}).toArray();
const clients = await db.collection('clients').find({}).toArray();

const projectMap = Object.fromEntries(projects.map(p => [p._id.toString(), p]));
const clientMap = Object.fromEntries(clients.map(c => [c._id.toString(), c]));

let updated = 0;
for (const q of quotations) {
  const update = {};

  // Set projectName if missing
  if (!q.projectName && q.project) {
    const proj = projectMap[q.project.toString()];
    if (proj?.name) update.projectName = proj.name;
  }

  // Set clientName if missing
  if (!q.clientName && q.client) {
    const client = clientMap[q.client.toString()];
    if (client?.name) update.clientName = client.name;
  }

  // If client is missing but project has client
  if (!q.clientName && !q.client && q.project) {
    const proj = projectMap[q.project.toString()];
    if (proj?.client) {
      const client = clientMap[proj.client.toString()];
      if (client?.name) {
        update.clientName = client.name;
        update.client = proj.client;
      }
    }
  }

  if (Object.keys(update).length > 0) {
    await db.collection('quotations').updateOne({ _id: q._id }, { $set: update });
    console.log(`Patched ${q.quotationNumber}: ${JSON.stringify(update)}`);
    updated++;
  }
}

console.log(`\nDone. Patched ${updated}/${quotations.length} quotations.`);
await mongoose.disconnect();
