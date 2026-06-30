import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth.js';
import useUIStore from '../stores/uiStore.js';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const openModal = useUIStore((s) => s.openModal);
  const token = searchParams.get('token');

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-rose-400" />
          <div className="px-8 py-10 text-center">
            <div className="text-4xl mb-4">⛔</div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">Invalid Reset Link</h2>
            <p className="text-sm text-slate-500 mb-6">This link is missing a reset token. Please request a new one.</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-sky-200 transition"
            >
              Request New Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm)  return setError('Passwords do not match.');

    setLoading(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-amber-400" />

        <div className="px-8 pt-7 pb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-2xl mb-5">
            🔒
          </div>

          {done ? (
            <>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Password updated!</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <button
                onClick={() => { navigate('/'); openModal('loginTrade'); }}
                className="w-full bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-sky-200 transition-all duration-200 active:scale-[0.99] mb-3"
              >
                Sign in as Trade Pro
              </button>
              <button
                onClick={() => { navigate('/'); openModal('loginContractor'); }}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-amber-200 transition-all duration-200 active:scale-[0.99]"
              >
                Sign in as Contractor
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Set new password</h2>
              <p className="text-sm text-slate-400 mb-7">
                Choose a strong password of at least 8 characters.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                    >
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    Confirm Password
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  />
                </div>

                {/* Strength hint */}
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-amber-500">
                    {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
                  </p>
                )}

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-sky-200 transition-all duration-200 active:scale-[0.99] mt-1"
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
