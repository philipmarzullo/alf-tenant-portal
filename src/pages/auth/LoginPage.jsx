import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    const ok = await signIn(email.trim(), password);
    if (ok) {
      navigate('/', { replace: true });
    }
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
          <h1 className="text-xl font-semibold text-dark-text mb-1">Sign in</h1>
          <p className="text-sm text-secondary-text mb-6">Melmac Mission Control</p>

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

            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {authError && (
              <div className="text-sm text-aa-red bg-red-50 rounded-lg px-3 py-2">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full py-2.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Sign In
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-amber-600 hover:text-amber-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
