import { Building2, Bell, Shield, LifeBuoy } from 'lucide-react';
import { useBranding } from '../../contexts/BrandingContext';

export default function SettingsPage() {
  const brand = useBranding();

  return (
    <div>
      <h1 className="text-xl font-semibold text-dark-text">Settings</h1>
      <p className="text-sm text-secondary-text mb-6">Configuration and account information.</p>

      <div className="space-y-6 max-w-2xl">
        {/* Company */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">Company</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              {brand.logoUrl && (
                <img src={brand.logoUrl} alt={brand.companyName || 'Company'} className="h-8 bg-gray-900 rounded px-2 py-1" />
              )}
              <span className="text-dark-text font-medium">{brand.companyName || 'Not configured'}</span>
            </div>
            {brand.contactEmail && (
              <div>
                <span className="text-secondary-text">Contact:</span>{' '}
                <span className="text-dark-text">{brand.contactEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">Notifications</h2>
          </div>
          <div className="space-y-3">
            {['Task deadline reminders', 'Agent action completions', 'Union rate change alerts'].map((item) => (
              <label key={item} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-aa-blue focus:ring-aa-blue" />
                <span className="text-sm text-dark-text">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">Data & Privacy</h2>
          </div>
          <div className="space-y-2 text-sm text-secondary-text">
            <p>Agent conversations are not persisted between sessions.</p>
            <p>All data is encrypted in transit and at rest.</p>
            <p>All requests are authenticated and rate-limited per tenant.</p>
          </div>
        </div>

        {/* Support */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <LifeBuoy size={16} className="text-aa-blue" />
            <h2 className="text-sm font-semibold text-dark-text">Support</h2>
          </div>
          <div className="space-y-2 text-sm text-secondary-text">
            <p>For platform issues, contact your account administrator.</p>
            <p>For urgent technical support, reach out to your dedicated support channel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
