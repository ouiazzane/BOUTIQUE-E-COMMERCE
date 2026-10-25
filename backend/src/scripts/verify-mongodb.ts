import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeMongoConnectionError } from '../utils/mongoDiagnostics.js';

const backendEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
const envResult = dotenv.config({ path: backendEnvPath });

if (envResult.error && (envResult.error as NodeJS.ErrnoException).code !== 'ENOENT') {
  console.error('MongoDB verification stopped: backend/.env could not be read.');
  process.exitCode = 1;
} else {
  const uri = process.env.MONGODB_URI?.trim() ?? '';

  if (!uri) {
    console.error('MongoDB verification stopped: MONGODB_URI is missing from backend/.env.');
    process.exitCode = 1;
  } else if (/<[^>]+>|<db_password>|<db_username>/i.test(uri)) {
    console.error('MongoDB verification stopped: replace URI placeholders in backend/.env locally before connecting.');
    process.exitCode = 1;
  } else if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    console.error('MongoDB verification stopped: MONGODB_URI has an unsupported scheme.');
    process.exitCode = 1;
  } else {
    const authority = uri.slice(uri.indexOf('://') + 3).split(/[/?#]/, 1)[0] ?? '';
    const hostList = authority.slice(authority.lastIndexOf('@') + 1);
    const hosts = hostList.split(',').map((host) => host.split(':')[0]?.toLowerCase() ?? '');

    if (!hosts.length || hosts.some((host) => !host.endsWith('.mongodb.net'))) {
      console.error('MongoDB verification stopped: configured hosts do not appear to be MongoDB Atlas hosts.');
      process.exitCode = 1;
    } else {
      const { connectDatabase, disconnectDatabase } = await import('../config/database.js');
      const mongoose = (await import('mongoose')).default;

      try {
        await connectDatabase();

        if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
          throw new Error('Connection is not ready');
        }

        await mongoose.connection.db.admin().command({ ping: 1 });
        console.log('MongoDB Atlas verification succeeded.');
        console.log(`Database: ${mongoose.connection.name}`);
        console.log('Diagnostic ping: ok.');
      } catch (error) {
        console.error(`MongoDB Atlas verification failed: ${describeMongoConnectionError(error)}`);
        process.exitCode = 1;
      } finally {
        if (mongoose.connection.readyState !== 0) {
          await disconnectDatabase();
        }
      }
    }
  }
}
