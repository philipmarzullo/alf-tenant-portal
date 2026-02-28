import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';

export default function ForgotPasswordPage() {
  const { resetPassword, authError } = useAuth();
  const brand = useBranding();
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
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Company Name */}
        <div className="flex flex-col items-center mb-8">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.companyName || 'Company'} className="h-12 mb-2" />
          ) : (
            <div className="text-white text-xl font-light tracking-wide mb-2">
              {brand.companyName || 'Operations Intelligence'}
            </div>
          )}
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
                className="inline-flex items-center gap-1.5 text-sm text-aa-blue hover:text-aa-blue/80 transition-colors"
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
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
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
                  className="w-full py-2.5 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Send Reset Link
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-aa-blue hover:text-aa-blue/80 transition-colors"
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
