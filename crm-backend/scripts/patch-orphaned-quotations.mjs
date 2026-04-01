/**
 * Patch orphaned approved quotations with placeholder names.
 * Since their project/client documents are deleted, we store names directly.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// Get the only existing client and project
const client = await db.collection('clients').findOne({});
const project = await db.collection('projects').findOne({});

console.log('Available client:', client?.name, client?._id);
console.log('Available project:', project?.name, project?._id);

// Patch QTN-1004 and QTN-1006 with the available client/project
// (or set placeholder names if you want to keep them separate)
const patches = [
  { quotationNumber: 'QTN-1004', clientName: client?.name || 'Client', projectName: project?.name || 'Project', client: client?._id, project: project?._id },
  { quotationNumber: 'QTN-1006', clientName: client?.name || 'Client', projectName: project?.name || 'Project', client: client?._id, project: project?._id },
];

for (const patch of patches) {
  const { quotationNumber, ...update } = patch;
  const result = await db.collection('quotations').updateOne(
    { quotationNumber },
    { $set: update }
  );
  console.log(`Patched ${quotationNumber}:`, result.modifiedCount ? 'OK' : 'Not found');
}

console.log('\nDone.');
await mongoose.disconnect();
