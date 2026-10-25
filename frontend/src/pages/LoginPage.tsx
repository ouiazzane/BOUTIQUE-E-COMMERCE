import { useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAppContext } from '../contexts/AppContext';
import api from '../services/api';

export default function LoginPage({ adminOnly = false }: { adminOnly?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      if (adminOnly && response.data.data.user.role !== 'admin') {
        setError('This account does not have administrator access.');
        return;
      }
      await login(response.data.data.token, response.data.data.user);
      const redirectTo = (location.state as { from?: unknown; message?: unknown } | null)?.from;
      const returnPath = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/account';
      navigate(adminOnly || response.data.data.user.role === 'admin' ? '/admin' : returnPath);
    } catch (err: any) {
      setError(axios.isAxiosError(err) && !err.response
        ? 'The API server is unavailable. Check that the backend is running on localhost:5000.'
        : err.response?.data?.message ?? 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">{adminOnly ? 'Secure area' : 'Welcome back'}</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{adminOnly ? 'Administrator sign in' : 'Sign in'}</h1>
      {!adminOnly && typeof (location.state as { message?: unknown } | null)?.message === 'string' && <p className="mt-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{(location.state as { message: string }).message}</p>}
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full rounded-full bg-slate-900 px-4 py-3 font-medium text-white disabled:cursor-wait disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>

      {adminOnly ? <p className="mt-5 text-sm text-slate-600"><Link to="/" className="font-semibold text-slate-900">Back to the shop</Link></p> : <p className="mt-5 text-sm text-slate-600">New here? <Link to="/register" state={location.state} className="font-semibold text-slate-900">Create a customer account</Link></p>}
    </div>
  );
}
