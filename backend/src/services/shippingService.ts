import { env } from '../config/env.js';
import { roundMoney } from './currencyService.js';

export const DEFAULT_FREE_SHIPPING_THRESHOLD = 200;
export const DEFAULT_SHIPPING_COST = 15;
export const SUPPORTED_SHIPPING_COUNTRIES = new Set(env.SHIPPING_COUNTRIES);

export type ShippingQuote = {
  supported: boolean;
  amount: number;
  freeShippingThreshold: number;
  defaultShippingCost: number;
  country: string;
  message: string;
};

export function normalizeCountryCode(country: string): string {
  const raw = String(country ?? '').trim();
  if (!raw) return '';

  const upper = raw.toUpperCase();
  const aliases: Record<string, string> = {
    MOROCCO: 'MA',
    MAROC: 'MA',
    MA: 'MA',
    BELGIUM: 'BE',
    BE: 'BE',
    GERMANY: 'DE',
    DE: 'DE',
    SPAIN: 'ES',
    ES: 'ES',
    ITALY: 'IT',
    IT: 'IT',
    NETHERLANDS: 'NL',
    NL: 'NL',
    LUXEMBOURG: 'LU',
    LU: 'LU',
    PORTUGAL: 'PT',
    PT: 'PT'
  };

  return aliases[upper] ?? upper;
}

export function isShippingDestinationSupported(country: string): boolean {
  const normalizedCountry = normalizeCountryCode(country);
  return SUPPORTED_SHIPPING_COUNTRIES.has(normalizedCountry);
}

export function calculateShippingCost(input: {
  subtotal: number;
  country: string;
  freeShippingThreshold?: number;
  defaultShippingCost?: number;
}): ShippingQuote {
  const { subtotal, country } = input;
  const normalizedCountry = normalizeCountryCode(country);
  const supported = isShippingDestinationSupported(country);
  const freeShippingThreshold = roundMoney(input.freeShippingThreshold ?? env.FREE_SHIPPING_THRESHOLD_EUR ?? DEFAULT_FREE_SHIPPING_THRESHOLD);
  const defaultShippingCost = roundMoney(input.defaultShippingCost ?? env.SHIPPING_COST_EUR ?? DEFAULT_SHIPPING_COST);
  if (freeShippingThreshold < 0 || defaultShippingCost < 0) {
    throw new Error('Shipping costs and thresholds must not be negative.');
  }

  if (!supported) {
    return {
      supported: false,
      amount: 0,
      freeShippingThreshold,
      defaultShippingCost,
      country: normalizedCountry,
      message: 'Shipping is not available for this destination.'
    };
  }

  const amount = subtotal >= freeShippingThreshold ? 0 : defaultShippingCost;

  return {
    supported: true,
    amount,
    freeShippingThreshold,
    defaultShippingCost,
    country: normalizedCountry,
    message: amount === 0 ? 'Free shipping applied.' : 'Standard shipping applied.'
  };
}
