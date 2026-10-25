import api from './api';

export type ShippingConfig = {
  supportedCountries: string[];
  defaultCountry: string;
  currency: 'EUR';
};

export type ShippingQuote = {
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: 'EUR';
  country: string;
  freeShippingThreshold: number;
  items: Array<{ productId: string; quantity: number; unitPrice: number; lineTotal: number }>;
};

export async function getShippingConfig(): Promise<ShippingConfig> {
  const response = await api.get('/shipping/config');
  return response.data.data as ShippingConfig;
}

export async function getShippingQuote(items: Array<{ productId: string; quantity: number }>, country: string): Promise<ShippingQuote> {
  const response = await api.post('/shipping/quote', { items, country });
  return response.data.data as ShippingQuote;
}
