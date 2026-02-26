import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const ok = await resetPassword(email.trim());
    if (ok) setSent(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-dark-nav-warm flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/alf-logo.jpg" alt="Alf" className="h-16 w-16 rounded-full mb-3" />
          <span className="text-amber-400 font-bold text-2xl">Alf</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {sent ? (
            <>
              <h1 className="text-xl font-semibold text-dark-text mb-2">Check your email</h1>
              <p className="text-sm text-secondary-text mb-6">
                We sent a password reset link to <span className="font-medium text-dark-text">{email}</span>.
                Check your inbox and follow the link to reset your password.
              </p>
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-dark-text mb-1">Forgot password</h1>
              <p className="text-sm text-secondary-text mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {authError && (
                  <div className="text-sm text-aa-red bg-red-50 rounded-lg px-3 py-2">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="w-full py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Send Reset Link
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
