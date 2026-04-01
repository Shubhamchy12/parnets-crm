/**
 * Force patch approved quotations that have orphaned project/client refs.
 * Reads all collections to find any matching data.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

// List all collections
const collections = await db.listCollections().toArray();
console.log('Collections:', collections.map(c => c.name).join(', '));

// Check all quotations raw
const quotations = await db.collection('quotations').find({ status: 'approved' }).toArray();
for (const q of quotations) {
  console.log('\nQuotation:', q.quotationNumber);
  console.log('  clientName:', q.clientName);
  console.log('  projectName:', q.projectName);
  console.log('  client ObjectId:', q.client);
  console.log('  project ObjectId:', q.project);
}

// Try to find clients/projects in any collection
const allClients = await db.collection('clients').find({}).toArray();
const allProjects = await db.collection('projects').find({}).toArray();
console.log('\nTotal clients in DB:', allClients.length);
console.log('Total projects in DB:', allProjects.length);
if (allClients.length > 0) console.log('Sample client:', allClients[0]?.name);
if (allProjects.length > 0) console.log('Sample project:', allProjects[0]?.name);

await mongoose.disconnect();
