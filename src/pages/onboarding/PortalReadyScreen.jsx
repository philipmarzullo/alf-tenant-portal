import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useTenantPortal } from '../../contexts/TenantPortalContext';

export default function PortalReadyScreen() {
  const navigate = useNavigate();
  const { workspaces, tools, dashboardDomains } = useTenantPortal();

  const counts = [
    { count: workspaces.length, label: 'workspaces' },
    { count: tools.length, label: 'tools' },
    { count: dashboardDomains.length, label: 'dashboard domains' },
  ].filter(c => c.count > 0);

  return (
    <div className="max-w-md mx-auto pt-16 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle size={32} className="text-green-500" />
        </div>
      </div>

      <h2 className="text-2xl font-light text-dark-text mb-2">Your portal is ready</h2>
      <p className="text-sm text-secondary-text mb-8">
        We've configured your operations portal based on your company profile.
      </p>

      {counts.length > 0 && (
        <div className="flex items-center justify-center gap-6 mb-10">
          {counts.map(({ count, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-semibold text-dark-text">{count}</div>
              <div className="text-xs text-secondary-text">{label}</div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/portal', { replace: true })}
        className="inline-flex items-center gap-2 px-6 py-3 bg-[#C84B0A] text-white text-sm font-medium rounded-lg hover:bg-[#C84B0A]/90 transition-colors"
      >
        Enter your portal
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
