import mongoose from 'mongoose';

import { env } from './env.js';

export async function connectDatabase() {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Configure MongoDB Atlas before starting the server.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI, { dbName: 'codealpha_ecommerce' });
  console.log('MongoDB connected successfully.');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}
