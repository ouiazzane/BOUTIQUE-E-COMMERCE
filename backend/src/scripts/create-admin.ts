import dotenv from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
const envResult = dotenv.config({ path: envPath });

if (envResult.error && (envResult.error as NodeJS.ErrnoException).code !== 'ENOENT') {
  console.error('Admin setup stopped: backend/.env could not be read.');
  process.exitCode = 1;
} else {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  let connected = false;

  try {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
      throw new Error('Run this command in an interactive terminal to enter the password securely.');
    }

    const firstName = (await readline.question('Prénom : ')).trim();
    const lastName = (await readline.question('Nom : ')).trim();
    const email = (await readline.question('Email administrateur : ')).trim().toLowerCase();
    readline.close();

    if (firstName.length < 2 || lastName.length < 2) {
      throw new Error('The first and last name must contain at least two characters.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('A valid email address is required.');
    }

    const password = await readHidden('Mot de passe (saisie masquée) : ');
    const confirmation = await readHidden('Confirmer le mot de passe (saisie masquée) : ');
    if (password.length < 12) {
      throw new Error('Use a password containing at least 12 characters.');
    }
    if (password !== confirmation) {
      throw new Error('The passwords do not match.');
    }

    const uri = process.env.MONGODB_URI?.trim() ?? '';
    const authority = uri.slice(uri.indexOf('://') + 3).split(/[/?#]/, 1)[0] ?? '';
    const hosts = authority.slice(authority.lastIndexOf('@') + 1).split(',');
    if (!uri || /<[^>]+>/.test(uri) || !/^mongodb(?:\+srv)?:\/\//i.test(uri) || hosts.some((host) => !host.split(':')[0].toLowerCase().endsWith('.mongodb.net'))) {
      throw new Error('MONGODB_URI must be a complete Atlas connection in backend/.env.');
    }

    const [{ connectDatabase, disconnectDatabase }, { default: User }, mongooseModule] = await Promise.all([
      import('../config/database.js'),
      import('../models/User.js'),
      import('mongoose')
    ]);
    const mongoose = mongooseModule.default;

    await connectDatabase();
    connected = true;
    if (mongoose.connection.name !== 'codealpha_ecommerce') {
      throw new Error('Connected database did not match codealpha_ecommerce.');
    }

    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') }).select('_id');
    if (existing) {
      throw new Error('An account with this email already exists. No account was changed.');
    }

    const created = await User.create({
      firstName,
      lastName,
      email,
      passwordHash: password,
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    const persisted = await User.findById(created._id);
    if (!persisted || persisted.role !== 'admin' || persisted.email !== email || !(await persisted.comparePassword(password))) {
      throw new Error('The account was written but the persisted record could not be verified.');
    }

    console.log(`Admin account created and verified in ${mongoose.connection.name}.`);
    console.log('Password verification: passed (password and hash were not displayed).');
  } catch (error) {
    const errorCode = (error as { code?: unknown })?.code;
    if (errorCode === 11000) {
      console.error('Admin setup stopped: this email already exists. No existing account was changed.');
    } else if (error instanceof Error && /interactive terminal|first and last name|valid email|at least 12|do not match|MONGODB_URI|database did not match|already exists|could not be verified/.test(error.message)) {
      console.error(`Admin setup stopped: ${error.message}`);
    } else {
      console.error(`Admin setup failed${errorCode ? ` (database error ${String(errorCode)})` : ''}. Credentials and connection details were not logged.`);
    }
    process.exitCode = 1;
  } finally {
    readline.close();
    if (connected) {
      const { disconnectDatabase } = await import('../config/database.js');
      await disconnectDatabase();
    }
  }
}

async function readHidden(prompt: string): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal to enter the password securely.');
  }

  return new Promise((resolvePromise, rejectPromise) => {
    let value = '';
    process.stdout.write(prompt);
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.resume();

    const finish = (error?: Error) => {
      input.off('data', onData);
      input.setRawMode(false);
      process.stdout.write('\n');
      if (error) rejectPromise(error);
      else resolvePromise(value);
    };

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish(new Error('Password entry cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (character >= ' ' && character !== '\u007f') {
          value += character;
          process.stdout.write('*');
        }
      }
    };

    input.on('data', onData);
  });
}
