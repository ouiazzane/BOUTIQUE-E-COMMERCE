import { Minus, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useAppContext } from '../contexts/AppContext';
import CatalogProductImage from '../components/CatalogProductImage';
import { getShippingConfig, getShippingQuote } from '../services/shipping';
import { formatMoney } from '../services/currency';
import { getProductName } from '../utils/catalogText';

export default function CartPage() {
  const { cart, cartLoading, cartError, updateCartQuantity, removeFromCart } = useAppContext();
  const quoteQuery = useQuery({
    queryKey: ['cart-shipping-quote', cart.map((item) => [item.productId, item.quantity])],
    enabled: cart.length > 0,
    queryFn: async () => {
      const config = await getShippingConfig();
      return getShippingQuote(cart.map(({ productId, quantity }) => ({ productId, quantity })), config.defaultCountry);
    }
  });
  const quotedItems = new Map(quoteQuery.data?.items.map((item) => [item.productId, item]) ?? []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Your cart</h1>
      {cartError && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{cartError}</p>}
      {cartLoading && <p className="text-sm text-slate-500">Synchronizing your cart…</p>}

      {cart.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          Your cart is empty. <Link to="/products" className="font-semibold text-slate-900">Browse the shop</Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.productId} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[120px_1fr_auto]">
                <CatalogProductImage product={item.product} className="h-28 w-full rounded-xl object-cover" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{getProductName(item.product.sku, item.product.name)}</h3>
                  <p className="mt-1 text-sm text-slate-500">{quotedItems.has(item.productId) ? formatMoney(quotedItems.get(item.productId)!.unitPrice) : '—'} / item</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)} className="rounded-full border border-slate-200 p-2"><Minus className="h-4 w-4" /></button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity + 1)} className="rounded-full border border-slate-200 p-2"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button type="button" onClick={() => removeFromCart(item.productId)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  <span className="text-lg font-semibold text-slate-900">{quotedItems.has(item.productId) ? formatMoney(quotedItems.get(item.productId)!.lineTotal) : '—'}</span>
                </div>
              </div>
            ))}
          </div>

          <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Order summary</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between"><span>Subtotal</span><span>{quoteQuery.data ? formatMoney(quoteQuery.data.subtotal) : '—'}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{quoteQuery.data ? formatMoney(quoteQuery.data.shippingCost) : quoteQuery.isError ? 'Unavailable' : '—'}</span></div>
              <div className="flex justify-between text-base font-semibold text-slate-900"><span>Total</span><span>{quoteQuery.data ? formatMoney(quoteQuery.data.total) : '—'}</span></div>
            </div>
            {quoteQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700">Shipping could not be quoted. Check product availability and destination at checkout.</p>}
            <Link to="/checkout" className="mt-6 block rounded-full bg-slate-900 px-4 py-3 text-center font-medium text-white">Proceed to checkout</Link>
            <Link to="/products" className="mt-3 block text-center text-sm font-medium text-slate-700">Continue shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
