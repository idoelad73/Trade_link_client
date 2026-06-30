import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth.js';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email,     setEmail]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email address.');

    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch {
      // Generic — never reveal server errors to avoid email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-amber-400" />

        <div className="px-8 pt-7 pb-8">
          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 mb-6 transition"
          >
            ← Back to home
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-2xl mb-5">
            🔑
          </div>

          {submitted ? (
            <>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                If an account with that email exists, we've sent a password reset link. Please check your inbox (and spam folder).
              </p>
              <p className="text-xs text-slate-400 mb-6">The link expires in 30 minutes.</p>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg shadow-sky-200 transition-all duration-200 active:scale-[0.99]"
              >
                Back to home
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Forgot password?</h2>
              <p className="text-sm text-slate-400 mb-7">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  />
                </div>

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
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
