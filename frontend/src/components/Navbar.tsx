import { Menu, Search, ShoppingBag, UserCircle2, LogOut, X, Store, Package, UserRound } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { useAppContext } from '../contexts/AppContext';

export default function Navbar() {
  const { cart, user, authLoading, logout } = useAppContext();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeCategory = new URLSearchParams(location.search).get('category');
  const maisonActive = location.pathname === '/products' && activeCategory === 'maison';
  const boutiqueActive = location.pathname.startsWith('/products') && !maisonActive;
  const navClass = (active: boolean) => `rounded-lg px-2 py-2 transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`;

  const onSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = encodeURIComponent(search.trim());
    navigate(`/products?search=${query}`);
    setMobileOpen(false);
  };

  useEffect(() => setMobileOpen(false), [location.pathname, location.search]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-bold text-slate-950 sm:text-xl"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white"><Store className="h-4 w-4" /></span><span>CodeAlpha<span className="ml-1 text-indigo-600">Store</span></span></Link>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 lg:flex">
          <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined} className={navClass(location.pathname === '/')}>Home</Link>
          <Link to="/products" aria-current={boutiqueActive ? 'page' : undefined} className={navClass(boutiqueActive)}>Shop</Link>
          <Link to="/products?category=maison" aria-current={maisonActive ? 'page' : undefined} className={navClass(maisonActive)}>Home & Living</Link>
        </nav>

        <form onSubmit={onSearch} className="hidden w-full max-w-sm items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </form>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link to="/cart" aria-label={`Cart${totalItems ? `, ${totalItems} item(s)` : ''}`} className="relative inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
            <ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] text-white">{totalItems}</span>}
          </Link>
          {user ? <div className="hidden items-center gap-3 md:flex">
            <Link to="/account" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"><UserCircle2 className="h-4 w-4" />{user.firstName}</Link>
            {user.role === 'admin' && <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"><Package className="h-4 w-4" />Admin</Link>}
            <button type="button" onClick={handleLogout} aria-label="Log out" title="Log out" className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"><LogOut className="h-4 w-4" /></button>
          </div> : authLoading ? <span className="hidden text-sm text-slate-400 md:inline">Checking session…</span> : <div className="hidden items-center gap-2 sm:flex"><Link to="/login" className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">Log in</Link><Link to="/register" className="hidden h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 md:inline-flex">Create account</Link></div>}
          <button type="button" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} aria-controls="client-mobile-menu" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>

      {mobileOpen && <div id="client-mobile-menu" className="border-t border-slate-200 bg-white px-4 pb-5 pt-4 shadow-lg sm:px-6 lg:hidden">
        <form onSubmit={onSearch} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"><Search className="h-4 w-4 shrink-0 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" className="w-full bg-transparent text-sm outline-none" /><button type="submit" className="text-sm font-semibold text-indigo-700">Search</button></form>
        <nav className="mt-4 grid gap-1 text-sm font-semibold">
          <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined} className={navClass(location.pathname === '/')}>Home</Link><Link to="/products" aria-current={boutiqueActive ? 'page' : undefined} className={navClass(boutiqueActive)}>Shop</Link><Link to="/products?category=maison" aria-current={maisonActive ? 'page' : undefined} className={navClass(maisonActive)}>Home & Living</Link>
        </nav>
        <div className="mt-3 border-t border-slate-100 pt-3">
          {authLoading ? <p className="px-3 py-3 text-sm text-slate-500">Checking session…</p> : user ? <div className="grid gap-1 text-sm font-semibold text-slate-700">
            <Link to="/account" className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-slate-50"><UserRound className="h-4 w-4" />My account</Link>
            {user.role === 'admin' && <Link to="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-indigo-700 hover:bg-indigo-50"><Package className="h-4 w-4" />Admin</Link>}
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-left text-rose-700 hover:bg-rose-100"><LogOut className="h-4 w-4" />Log out</button>
          </div> : <div className="grid grid-cols-2 gap-2"><Link to="/login" className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">Log in</Link><Link to="/register" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">Create account</Link></div>}
        </div>
      </div>}
    </header>
  );
}
