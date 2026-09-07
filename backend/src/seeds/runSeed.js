import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { seedDemoData } from './demoSeed.js';

connectDB()
  .then(async () => {
    await seedDemoData();
    console.log('✅ Seed complete.');
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
