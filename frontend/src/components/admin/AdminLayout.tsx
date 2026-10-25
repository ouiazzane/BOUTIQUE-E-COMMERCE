import { Boxes, LayoutDashboard, LogOut, Package, ShoppingBag, Store, Users } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { useAppContext } from '../../contexts/AppContext';

const navigation = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Boxes },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/users', label: 'Users', icon: Users }
];

export default function AdminLayout() {
  const { user, logout } = useAppContext();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-slate-950 px-5 py-6 text-white lg:min-h-screen lg:px-6">
        <NavLink to="/admin" className="flex items-center gap-3 text-lg font-bold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500"><Store className="h-5 w-5" /></span>
          <span>CodeAlpha <span className="block text-xs font-medium text-slate-400">ADMIN</span></span>
        </NavLink>
        <nav className="mt-8 flex gap-2 overflow-x-auto pb-2 lg:flex-col">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 hidden border-t border-slate-800 pt-5 lg:block">
          <p className="truncate text-sm font-medium">{user?.firstName} {user?.lastName}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <button type="button" onClick={handleLogout} className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/20"><LogOut className="h-4 w-4" />Log out</button>
          <NavLink to="/" className="mt-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white"><Store className="h-4 w-4" />Back to the shop</NavLink>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Administration</p>
            <h1 className="mt-1 text-lg font-semibold text-slate-900">{navigation.find((item) => item.to === location.pathname)?.label ?? 'Store management'}</h1>
          </div>
          <NavLink to="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">View shop</NavLink>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </section>
    </div>
  );
}
