import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { describeMongoConnectionError } from './utils/mongoDiagnostics.js';

async function startServer() {
  try {
    await connectDatabase();
    app.listen(env.PORT, () => {
      console.log(`Backend listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error(`Backend startup failed: ${describeMongoConnectionError(error)}`);
    process.exit(1);
  }
}

startServer();
