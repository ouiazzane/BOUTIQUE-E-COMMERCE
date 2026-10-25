import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAppContext } from '../contexts/AppContext';
import api from '../services/api';
import { formatMoney } from '../services/currency';
import { getShippingConfig, getShippingQuote } from '../services/shipping';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart, user } = useAppContext();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: ''
  });
  const [loading, setLoading] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const shippingConfigQuery = useQuery({
    queryKey: ['shipping-config'],
    queryFn: getShippingConfig
  });
  const country = form.country || shippingConfigQuery.data?.defaultCountry || '';
  const quoteQuery = useQuery({
    queryKey: ['checkout-shipping-quote', country, cart.map((item) => [item.productId, item.quantity])],
    enabled: cart.length > 0 && Boolean(country),
    queryFn: () => getShippingQuote(cart.map(({ productId, quantity }) => ({ productId, quantity })), country)
  });

  useEffect(() => {
    if (shippingConfigQuery.data && !form.country) {
      setForm((current) => ({ ...current, country: shippingConfigQuery.data.defaultCountry }));
    }
  }, [form.country, shippingConfigQuery.data]);

  const subtotal = quoteQuery.data?.subtotal;
  const shipping = quoteQuery.data?.shippingCost;
  const total = quoteQuery.data?.total;
  const countryLabel = (code: string) => code === 'MA' ? 'Maroc (MA)' : code;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      navigate('/login', { state: { from: '/checkout', message: 'Please log in to place your order.' } });
      return;
    }

    idempotencyKey.current ??= crypto.randomUUID();
    setLoading(true);

    try {
      const response = await api.post('/orders', {
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        shippingAddress: form,
        paymentMethod: 'cash_on_delivery',
        idempotencyKey: idempotencyKey.current
      });

      await clearCart();
      idempotencyKey.current = null;
      navigate('/order-success', { state: { order: response.data.data } });
    } catch (error: any) {
      alert(error.response?.data?.message ?? 'Your order could not be placed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold text-slate-900">Checkout</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Country</label>
            <select value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" required disabled={shippingConfigQuery.isLoading || !shippingConfigQuery.data?.supportedCountries.length}>
              {(shippingConfigQuery.data?.supportedCountries ?? []).map((code) => <option key={code} value={code}>{countryLabel(code)}</option>)}
            </select>
            {shippingConfigQuery.isError && <p role="alert" className="mt-1 text-sm text-rose-700">Shipping destinations could not be loaded.</p>}
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
            <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">City</label>
            <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Postal code</label>
            <input value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
          </div>
        </div>
      </div>

      <aside className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Order summary</h2>
        <div className="mt-5 space-y-3 text-sm text-slate-600">
          <div className="flex justify-between"><span>Subtotal</span><span>{subtotal === undefined ? '—' : formatMoney(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{shipping === undefined ? '—' : formatMoney(shipping)}</span></div>
          <div className="flex justify-between text-lg font-semibold text-slate-900"><span>Total</span><span>{total === undefined ? '—' : formatMoney(total)}</span></div>
        </div>
        {quoteQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700">A current price and shipping quote is required before ordering.</p>}
        <button type="submit" disabled={loading || cart.length === 0 || !quoteQuery.data || quoteQuery.isFetching} className="mt-8 w-full rounded-full bg-slate-900 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          {loading ? 'Placing order…' : 'Place order'}
        </button>
      </aside>
    </form>
  );
}
