import { connectDatabase, disconnectDatabase } from '../config/database.js';

async function main() {
  try {
    await connectDatabase();
    console.log('Database connection check succeeded.');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Database check failed:', error);
    process.exit(1);
  }
}

main();
