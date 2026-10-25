import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AccountPage from './pages/AccountPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import { useAppContext } from './contexts/AppContext';
import AdminLayout from './components/admin/AdminLayout';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAppContext();
  if (authLoading) return <div className="py-16 text-center text-slate-500">Checking your session…</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
}

function AdminRoute() {
  const { user, authLoading } = useAppContext();
  if (authLoading) return <div className="py-16 text-center text-slate-500">Checking permissions…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return user.role === 'admin' ? <AdminLayout /> : <Navigate to="/" replace />;
}

function UnmatchedRoute() {
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/^\/{2,}/, '/');

  if (normalizedPath !== location.pathname) {
    return <Navigate to={{ pathname: normalizedPath, search: location.search, hash: location.hash }} replace />;
  }

  return <Navigate to="/" replace />;
}

export default function App() {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith('/admin');

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
      {!isAdminArea && <Navbar />}
      <main className={isAdminArea ? 'flex-1' : 'mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin/login" element={<LoginPage adminOnly />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="/order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
          <Route path="*" element={<UnmatchedRoute />} />
        </Routes>
      </main>
      {!isAdminArea && <Footer />}
    </div>
  );
}
