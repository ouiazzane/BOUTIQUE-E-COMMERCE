import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Clock3, LogOut, Mail, PackageCheck, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAppContext } from '../contexts/AppContext';
import api from '../services/api';
import { formatMoney } from '../services/currency';

type OrderSummary = {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  shippingStatus?: string;
  currency?: string;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

export default function AccountPage() {
  const { user, logout } = useAppContext();
  const ordersQuery = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => (await api.get('/orders/my-orders')).data.data as OrderSummary[],
    enabled: Boolean(user)
  });
  const orders = ordersQuery.data ?? [];
  const pendingOrders = orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length;

  if (!user) return <p className="py-12 text-center text-slate-500">Sign in to view your account.</p>;

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-2xl font-bold text-white">
              {user.firstName.slice(0, 1).toUpperCase()}{user.lastName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-indigo-200">Customer account</p>
              <h1 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{user.firstName} {user.lastName}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-300"><Mail className="h-4 w-4 shrink-0" />{user.email}</p>
            </div>
          </div>
          <button type="button" onClick={logout} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 sm:self-center">
            <LogOut className="h-4 w-4" />Log out
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><PackageCheck className="h-5 w-5" /></span>
          <div><p className="text-sm text-slate-500">Orders placed</p><p className="mt-0.5 text-2xl font-bold text-slate-950">{ordersQuery.isLoading ? '—' : orders.length}</p></div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Clock3 className="h-5 w-5" /></span>
          <div><p className="text-sm text-slate-500">In progress</p><p className="mt-0.5 text-2xl font-bold text-slate-950">{ordersQuery.isLoading ? '—' : pendingOrders}</p></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Order tracking</p><h2 className="mt-1 text-xl font-bold text-slate-950">Order history</h2></div>
          <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">Continue shopping <ArrowRight className="h-4 w-4" /></Link>
        </div>

        {ordersQuery.isLoading ? <div className="space-y-3 p-5 sm:p-6"><div className="h-16 animate-pulse rounded-xl bg-slate-100" /><div className="h-16 animate-pulse rounded-xl bg-slate-100" /></div> : ordersQuery.isError ? <div role="alert" className="m-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:m-6">We couldn’t load your orders. Please try again shortly.</div> : orders.length === 0 ? <div className="px-5 py-12 text-center sm:px-6"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><PackageCheck className="h-6 w-6" /></span><h3 className="mt-4 font-semibold text-slate-900">No orders yet</h3><p className="mt-1 text-sm text-slate-500">Your purchases and order updates will appear here.</p><Link to="/products" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Explore the shop <ArrowRight className="h-4 w-4" /></Link></div> : <div className="divide-y divide-slate-100">{orders.map((order) => { const displayStatus = order.shippingStatus === 'pending' && order.status === 'confirmed' ? 'confirmed' : order.shippingStatus ?? order.status; return <article key={order._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><PackageCheck className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{order.orderNumber}</p><p className="text-sm text-slate-500">{new Date(order.createdAt).toLocaleDateString('en-US')}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${displayStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700' : displayStatus === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800'}`}>{displayStatus === 'delivered' ? <BadgeCheck className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{statusLabel[displayStatus] ?? displayStatus}</span><span className="min-w-20 text-right font-bold text-slate-950">{formatMoney(order.total, order.currency ?? 'EUR')}</span></div></article>; })}</div>}
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">{user.role === 'admin' ? <ShieldCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</span>
        <div><h2 className="font-semibold text-slate-900">Account information</h2><p className="mt-1 text-sm text-slate-500">{user.role === 'admin' ? 'Administrator account' : 'Customer account'}{user.emailVerified ? ' · Email verified' : ''}{user.isActive === false ? ' · Account disabled' : ''}</p></div>
      </section>
    </div>
  );
}
