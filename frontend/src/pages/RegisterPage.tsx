import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAppContext } from '../contexts/AppContext';
import api from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAppContext();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const onChange = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/register', { ...form });
      await login(response.data.data.token, response.data.data.user);
      const redirectTo = (location.state as { from?: unknown } | null)?.from;
      navigate(typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/account');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'We could not create your account.');
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-3xl font-bold text-slate-900">Create an account</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">First name</label>
          <input value={form.firstName} onChange={(event) => onChange('firstName', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Last name</label>
          <input value={form.lastName} onChange={(event) => onChange('lastName', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
          <input value={form.email} type="email" onChange={(event) => onChange('email', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
          <input value={form.password} type="password" onChange={(event) => onChange('password', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
          <input value={form.confirmPassword} type="password" onChange={(event) => onChange('confirmPassword', event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
        </div>

        {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}

        <button type="submit" className="md:col-span-2 rounded-full bg-slate-900 px-4 py-3 font-medium text-white">Create account</button>
      </form>

      <p className="mt-5 text-sm text-slate-600">
        Already have an account? <Link to="/login" state={location.state} className="font-semibold text-slate-900">Sign in</Link>
      </p>
    </div>
  );
}
