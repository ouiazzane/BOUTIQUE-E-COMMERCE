import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Eye, X } from 'lucide-react';

import api from '../../services/api';
import { getProductName } from '../../utils/catalogText';
import { formatMoney } from '../../services/currency';

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
type AdminOrder = { _id: string; orderNumber: string; total: number; subtotal: number; shippingCost: number; discountTotal: number; currency?: string; status: OrderStatus; shippingStatus?: OrderStatus; paymentStatus: string; paymentMethod: string; paymentHistory?: { status: string; method: string; changedAt: string; note: string }[]; createdAt: string; userId?: { firstName?: string; lastName?: string; email?: string } | string; items: { name: string; sku: string; quantity: number; unitPrice: number; lineTotal: number }[]; shippingAddress?: { fullName: string; phone: string; address: string; city: string; postalCode: string; country: string } };
const transitions: Record<OrderStatus, OrderStatus[]> = { pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const statusLabels: Record<OrderStatus, string> = { pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
const paymentMethodLabel: Record<string, string> = { cash_on_delivery: 'Cash on delivery' };
const paymentStatusLabel: Record<string, string> = { pending: 'Pending', paid: 'Paid', failed: 'Failed', refunded: 'Refunded' };
const errorMessage = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'The request failed.';

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [detail, setDetail] = useState<AdminOrder | null>(null);
  const [error, setError] = useState('');
  const ordersQuery = useQuery({ queryKey: ['admin-orders'], queryFn: async () => (await api.get('/admin/orders')).data.data as AdminOrder[] });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => api.patch(`/admin/orders/${id}/status`, { status }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }); setSelected(null); setError(''); },
    onError: (mutationError) => setError(errorMessage(mutationError))
  });
  const paymentMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => api.patch(`/admin/orders/${id}/payment/cash-on-delivery`, { confirmed: true, note }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setSelected(null);
      setDetail(null);
      setError('');
    },
    onError: (mutationError) => setError(errorMessage(mutationError))
  });

  async function showDetails(order: AdminOrder) {
    setError(''); setSelected(order); setDetail(null);
    try { const response = await api.get(`/orders/${order._id}`); setDetail(response.data.data as AdminOrder); }
    catch (requestError) { setError(errorMessage(requestError)); }
  }
  function changeStatus(order: AdminOrder, status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    updateMutation.mutate({ id: order._id, status });
  }
  function confirmCashCollection(order: AdminOrder) {
    if (!window.confirm(`Confirm that cash was received for ${order.orderNumber}?`)) return;
    const note = window.prompt('Enter the cash collection reference or note (at least 5 characters).')?.trim();
    if (!note || note.length < 5) {
      setError('A cash collection reference or note of at least 5 characters is required.');
      return;
    }
    paymentMutation.mutate({ id: order._id, note });
  }

  const orders = ordersQuery.data ?? [];
  return <div className="space-y-6">
    <div><p className="text-sm font-medium text-indigo-600">Sales operations</p><h2 className="mt-1 text-3xl font-bold text-slate-950">Orders</h2><p className="mt-2 text-sm text-slate-500">Review order details and update fulfillment status.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="border-b border-slate-100 p-4"><h3 className="font-bold text-slate-900">All orders</h3><p className="text-sm text-slate-500">{orders.length} order(s)</p></div>
      {ordersQuery.isLoading ? <p className="p-8 text-slate-500">Loading orders…</p> : ordersQuery.isError ? <p role="alert" className="p-8 text-red-700">Could not load orders. Check your admin permissions.</p> : orders.length === 0 ? <div className="p-12 text-center"><ClipboardList className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No orders recorded</p><p className="mt-1 text-sm text-slate-500">New orders will appear here.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{orders.map((order) => { const customer = typeof order.userId === 'object' ? `${order.userId.firstName ?? ''} ${order.userId.lastName ?? ''}`.trim() : 'Customer'; return <tr key={order._id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-semibold text-slate-900">{order.orderNumber}</td><td className="px-5 py-4"><p className="font-medium">{customer || 'Customer'}</p>{typeof order.userId === 'object' && <p className="text-xs text-slate-500">{order.userId.email}</p>}</td><td className="px-5 py-4 text-slate-600">{new Date(order.createdAt).toLocaleDateString('en-US')}</td><td className="px-5 py-4 font-semibold">{formatMoney(order.total, order.currency ?? 'EUR')}</td><td className="px-5 py-4"><select aria-label={`Status for ${order.orderNumber}`} value={order.status} disabled={!transitions[order.status].length || updateMutation.isPending} onChange={(event) => changeStatus(order, event.target.value as OrderStatus)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold disabled:bg-slate-100">{[order.status, ...transitions[order.status]].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => void showDetails(order)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"><Eye className="h-4 w-4" />View</button></td></tr>; })}</tbody></table></div>}
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setDetail(null); } }}><section role="dialog" aria-modal="true" aria-label="Order details" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-indigo-600">Order details</p><h3 className="mt-1 text-2xl font-bold text-slate-950">{selected.orderNumber}</h3></div><button onClick={() => { setSelected(null); setDetail(null); }} type="button" aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      {!detail ? <p className="py-10 text-center text-sm text-slate-500">Loading details...</p> : <div className="mt-6 space-y-6"><div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><Info label="Status" value={statusLabels[detail.status]} /><Info label="Shipping status" value={statusLabels[detail.shippingStatus ?? detail.status]} /><Info label="Payment" value={`${paymentMethodLabel[detail.paymentMethod] ?? detail.paymentMethod.replace(/_/g, ' ')} | ${paymentStatusLabel[detail.paymentStatus] ?? detail.paymentStatus}`} /><Info label="Subtotal" value={formatMoney(detail.subtotal, detail.currency ?? 'EUR')} /><Info label="Shipping" value={formatMoney(detail.shippingCost, detail.currency ?? 'EUR')} /><Info label="Total" value={formatMoney(detail.total, detail.currency ?? 'EUR')} /></div>{detail.paymentMethod === 'cash_on_delivery' && detail.paymentStatus === 'pending' && detail.status === 'delivered' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-900">Confirm collection only after the cash has actually been received. The note is stored with your admin identity and timestamp.</p><button type="button" disabled={paymentMutation.isPending} onClick={() => confirmCashCollection(detail)} className="mt-3 rounded-lg bg-amber-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{paymentMutation.isPending ? 'Recording...' : 'Confirm cash received'}</button></div>}{detail.paymentHistory?.map((entry, index) => <p key={`${entry.changedAt}-${index}`} className="text-xs text-slate-500">Cash receipt recorded {new Date(entry.changedAt).toLocaleString('en-US')}: {entry.note}</p>)}<div><h4 className="font-bold text-slate-900">Items</h4><div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">{detail.items?.map((item) => <div key={item.sku} className="flex items-center justify-between gap-4 p-3 text-sm"><div><p className="font-semibold">{getProductName(item.sku, item.name)}</p><p className="text-xs text-slate-500">{item.sku} | {item.quantity} x {formatMoney(item.unitPrice, detail.currency ?? 'EUR')}</p></div><p className="font-semibold">{formatMoney(item.lineTotal, detail.currency ?? 'EUR')}</p></div>)}</div></div>{detail.shippingAddress && <div><h4 className="font-bold text-slate-900">Shipping address</h4><p className="mt-2 text-sm leading-6 text-slate-600">{detail.shippingAddress.fullName}<br />{detail.shippingAddress.address}<br />{detail.shippingAddress.postalCode} {detail.shippingAddress.city}, {detail.shippingAddress.country}<br />{detail.shippingAddress.phone}</p></div>}</div>}
      <div className="mt-6 flex justify-end"><button type="button" onClick={() => { setSelected(null); setDetail(null); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Close</button></div>
    </section></div>}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-800">{value}</p></div>; }
