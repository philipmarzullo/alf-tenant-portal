import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword, authError } = useAuth();
  const brand = useBranding();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setValidationError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const ok = await updatePassword(password);
    if (ok) {
      setDone(true);
      setTimeout(() => navigate('/', { replace: true }), 2000);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-dark-nav flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.companyName || 'Company'} className="h-12 mb-2" />
          ) : (
            <img src="/logo-white.png" alt={brand.companyName || 'Company'} className="h-12 mb-2" />
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
              <h1 className="text-xl font-semibold text-dark-text mb-2">Password updated</h1>
              <p className="text-sm text-secondary-text">Redirecting to the portal...</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-dark-text mb-1">Set new password</h1>
              <p className="text-sm text-secondary-text mb-6">
                Enter your new password below.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-aa-blue"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>

                {(validationError || authError) && (
                  <div className="text-sm text-aa-red bg-red-50 rounded-lg px-3 py-2">
                    {validationError || authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !password || !confirm}
                  className="w-full py-2.5 bg-aa-blue text-white text-sm font-medium rounded-lg hover:bg-aa-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
