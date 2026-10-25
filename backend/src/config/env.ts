import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendEnvPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.env');
dotenv.config({ path: backendEnvPath });

export function resolveJwtSecret(name: string, value: string | undefined, fallback: string): string {
  const secret = value?.trim() ?? '';
  if (process.env.NODE_ENV === 'production') {
    if (secret.length < 32 || secret.toLowerCase().includes('replace_me')) {
      throw new Error(`${name} must be configured with a strong secret in production.`);
    }
    return secret;
  }

  return secret || fallback;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  JWT_ACCESS_SECRET: resolveJwtSecret('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET, 'dev-access-secret'),
  JWT_REFRESH_SECRET: resolveJwtSecret('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET, 'dev-refresh-secret'),
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT ?? 587) === 465,
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? 'no-reply@example.com',
  SHIPPING_COUNTRIES: (process.env.SHIPPING_COUNTRIES ?? 'MA').split(',').map((country) => country.trim().toUpperCase()).filter(Boolean),
  SHIPPING_COST_EUR: Number(process.env.SHIPPING_COST_EUR ?? 15),
  FREE_SHIPPING_THRESHOLD_EUR: Number(process.env.FREE_SHIPPING_THRESHOLD_EUR ?? 200)
};
