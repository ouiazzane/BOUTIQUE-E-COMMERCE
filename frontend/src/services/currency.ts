export const SUPPORTED_CURRENCIES = ['EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: SupportedCurrency = 'EUR';

export function normalizeCurrency(value: string | undefined): SupportedCurrency {
  if (value && value.trim().toUpperCase() !== DEFAULT_CURRENCY) {
    throw new Error(`Unsupported display currency: ${value}`);
  }
  return DEFAULT_CURRENCY;
}

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const normalizedCurrency = normalizeCurrency(currency);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}
