import { connectDatabase, disconnectDatabase } from '../config/database.js';
import mongoose from 'mongoose';

async function main() {
  try {
    await connectDatabase();

    const database = mongoose.connection.db;
    if (!database) {
      throw new Error('Database handle unavailable after connection.');
    }

    const collections = await database.listCollections({}, { nameOnly: true }).toArray();
    console.log(`Read-only Atlas inventory for database: ${database.databaseName}`);

    if (collections.length === 0) {
      console.log('Collections: none found.');
      return;
    }

    for (const { name } of collections) {
      const documentCount = await database.collection(name).countDocuments({});
      console.log(`${name}: ${documentCount} documents`);
    }
  } catch (error) {
    console.error('Atlas inventory failed. Check the Atlas connection and read permissions. No data was modified.');
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnectDatabase();
    }
  }
}

await main();