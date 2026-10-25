import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import api from '../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setMessage('Your password has been updated. You can now sign in.');
    } catch (requestError) {
      setError((requestError as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'The reset link is invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return <p role="alert" className="mx-auto max-w-md rounded-xl bg-rose-50 p-5 text-sm text-rose-800">The password reset link is missing its token.</p>;
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-3xl font-bold text-slate-900">Reset password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
          <input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Confirm new password</label>
          <input type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        <button type="submit" disabled={submitting || Boolean(message)} className="w-full rounded-full bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-60">
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
      <Link to="/login" className="mt-5 inline-block text-sm font-semibold text-slate-700">Back to sign in</Link>
    </div>
  );
}
