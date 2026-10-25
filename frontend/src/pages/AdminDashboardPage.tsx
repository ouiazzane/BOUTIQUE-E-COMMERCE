import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Boxes, Package, ShoppingBag, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import api from '../services/api';
import { formatMoney } from '../services/currency';

export default function AdminDashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await api.get('/admin/stats');
      return response.data.data;
    }
  });

  if (isLoading) return <p className="rounded-2xl bg-white p-6 text-slate-500">Loading live statistics…</p>;
  if (isError || !data) return <p role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700">Could not load the dashboard. Check your connection and permissions.</p>;

  const shortcuts = [
    { to: '/admin/products', label: 'Manage products', icon: Package },
    { to: '/admin/categories', label: 'Manage categories', icon: Boxes },
    { to: '/admin/orders', label: 'Track orders', icon: ShoppingBag },
    { to: '/admin/users', label: 'View customers', icon: Users }
  ];

  return (
    <div className="space-y-8">
      <div><p className="text-sm font-medium text-indigo-600">Welcome to your workspace</p><h2 className="mt-1 text-3xl font-bold text-slate-950">Overview</h2><p className="mt-2 text-slate-500">Live metrics from your database.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'Active products', value: data.activeProducts },
          { label: 'Out of stock', value: data.outOfStockProducts },
          { label: 'Orders', value: data.totalOrders },
          { label: 'Pending orders', value: data.pendingOrders },
          { label: 'Customers', value: data.customerCount },
          { label: 'Revenue', value: formatMoney(data.totalRevenue) }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="group flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300"><span className="flex items-center gap-3 text-sm font-semibold text-slate-700"><Icon className="h-5 w-5 text-indigo-600" />{label}</span><ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" /></Link>)}
      </section>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold text-slate-900">Recent orders</h3><p className="text-sm text-slate-500">Latest sales activity</p></div><Link to="/admin/orders" className="text-sm font-semibold text-indigo-600">View all</Link></div>
        {data.recentOrders?.length ? <div className="divide-y divide-slate-100">{data.recentOrders.map((order: { _id: string; orderNumber: string; total: number; status: string; createdAt: string }) => <div key={order._id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-semibold text-slate-800">{order.orderNumber}</p><p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString('en-US')}</p></div><div className="text-right"><p className="font-semibold">{formatMoney(order.total)}</p><p className="text-xs capitalize text-slate-500">{order.status}</p></div></div>)}</div> : <p className="px-5 py-8 text-sm text-slate-500">No orders recorded yet.</p>}
      </section>
    </div>
  );
}
