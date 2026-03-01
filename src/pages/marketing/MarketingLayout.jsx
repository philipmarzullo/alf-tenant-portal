import { Link, Outlet } from 'react-router-dom';
import AlfMark from '../../components/shared/AlfMark';

export default function MarketingLayout() {
  return (
    <div className="min-h-screen bg-alf-warm-white flex flex-col">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-alf-warm-white border-b border-alf-bone">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AlfMark variant="light" size="sm" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/pricing"
              className="text-sm font-medium text-alf-dark hover:text-alf-orange transition-colors"
              style={{ fontFamily: "var(--font-marketing-body)" }}
            >
              Pricing
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-alf-dark hover:text-alf-orange transition-colors"
              style={{ fontFamily: "var(--font-marketing-body)" }}
            >
              Log In
            </Link>
            <a
              href="mailto:support@alfpro.ai?subject=Demo request"
              className="px-4 py-2 bg-alf-orange text-white text-sm font-medium rounded-lg hover:bg-alf-orange/90 transition-colors"
              style={{ fontFamily: "var(--font-marketing-body)" }}
            >
              Request a Demo
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-alf-dark text-white/60 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm"
          style={{ fontFamily: "var(--font-marketing-body)" }}
        >
          <div className="flex items-center gap-2">
            <AlfMark variant="dark" size="sm" />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>alfpro.ai</span>
            <span className="text-white/20">|</span>
            <a href="mailto:support@alfpro.ai" className="hover:text-white transition-colors">support@alfpro.ai</a>
            <span className="text-white/20">|</span>
            <span>&copy; 2026 Alf &middot; Operations Intelligence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
