export const DEFAULT_CURRENCY = 'EUR' as const;
export const SUPPORTED_CURRENCIES = [DEFAULT_CURRENCY] as const;
export type SupportedCurrency = typeof DEFAULT_CURRENCY;

export function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error('Currency amount must be a finite number.');
  }
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function normalizeCurrency(value: string | undefined): SupportedCurrency {
  if (value && value.trim().toUpperCase() !== DEFAULT_CURRENCY) {
    throw new Error(`Unsupported billing currency: ${value}`);
  }
  return DEFAULT_CURRENCY;
}

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const normalizedCurrency = normalizeCurrency(currency);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(roundMoney(amount));
}

export function getCurrencyConfig() {
  return {
    defaultCurrency: DEFAULT_CURRENCY,
    supportedCurrencies: [{ code: DEFAULT_CURRENCY, label: 'Euro' }],
    billingCurrency: DEFAULT_CURRENCY,
    displayOnlyConversion: false
  };
}
