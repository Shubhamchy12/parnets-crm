import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Project from '../models/Project.js';
import Client from '../models/Client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI;

async function listProjects() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📁 All Projects:\n');
    
    const projects = await Project.find({}).populate('client').lean();
    
    if (projects.length === 0) {
      console.log('⚠️  No projects found in database\n');
    } else {
      projects.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p._id}`);
        console.log(`   Client: ${p.client?.name || 'N/A'}`);
        console.log(`   Status: ${p.status || 'N/A'}`);
        console.log('');
      });
    }

    console.log(`Total: ${projects.length} project(s)\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

listProjects();
