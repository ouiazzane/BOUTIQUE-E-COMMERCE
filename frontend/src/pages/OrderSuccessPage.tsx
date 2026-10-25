import { Link, useLocation } from 'react-router-dom';
import { formatMoney } from '../services/currency';

export default function OrderSuccessPage() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order) {
    return <p className="text-slate-600">Order not found.</p>;
  }

  const statusLabels: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <h1 className="text-3xl font-bold text-slate-900">Order confirmed</h1>
      <p className="mt-3 text-slate-600">Your order has been placed successfully.</p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
        <p className="text-sm text-slate-500">Order number</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{order.orderNumber}</p>
        <p className="mt-4 text-sm text-slate-600">Total: {formatMoney(order.total, order.currency ?? 'EUR')}</p>
        <p className="text-sm text-slate-600">Status: {statusLabels[order.status] ?? order.status}</p>
      </div>
      <div className="mt-6 flex justify-center gap-4">
        <Link to="/account" className="rounded-full bg-slate-900 px-5 py-3 font-medium text-white">View my orders</Link>
        <Link to="/products" className="rounded-full border border-slate-200 px-5 py-3 font-medium text-slate-700">Continue shopping</Link>
      </div>
    </div>
  );
}
