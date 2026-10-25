import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-900 text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="text-lg font-semibold text-white">CodeAlpha Store</h3>
          <p className="mt-3 text-sm text-slate-300">A modern store designed for a seamless shopping experience.</p>
        </div>
        <div>
          <h4 className="font-semibold text-white">Navigation</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">Shop</Link></li>
            <li><Link to="/account">My account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white">Help</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li><Link to="/products">Shipping</Link></li>
            <li><Link to="/products">Payment</Link></li>
            <li><Link to="/products">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>hello@codealpha.store</li>
            <li>© 2026 CodeAlpha</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
