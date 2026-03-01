import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { setTenantContext } from '../agents/api';
import { useTenantId } from './TenantIdContext';

const BrandingContext = createContext(null);

// Alf defaults when no tenant is known (pre-login on single portal)
const ALF_DEFAULTS = {
  companyName: null,
  displayName: 'Operations Intelligence',
  logoUrl: null,
  primaryColor: '#C84B0A',
  sidebarBg: '#1C1C1C',
  websiteUrl: null,
  brandLoading: false,
};

export function BrandingProvider({ children }) {
  const { tenantId } = useTenantId();

  const [brand, setBrand] = useState({
    companyName: null,
    displayName: 'Operations Intelligence',
    logoUrl: null,
    primaryColor: null,
    sidebarBg: null,
    websiteUrl: null,
    brandLoading: true,
  });

  useEffect(() => {
    if (!supabase || !tenantId) {
      // No tenant known — apply Alf defaults
      if (ALF_DEFAULTS.primaryColor) {
        document.documentElement.style.setProperty('--color-aa-blue', ALF_DEFAULTS.primaryColor);
      }
      if (ALF_DEFAULTS.sidebarBg) {
        document.documentElement.style.setProperty('--color-dark-nav', ALF_DEFAULTS.sidebarBg);
      }
      document.title = 'alf | Operations Intelligence';
      setBrand({ ...ALF_DEFAULTS });
      return;
    }

    setBrand((prev) => ({ ...prev, brandLoading: true }));

    supabase
      .rpc('get_tenant_branding', { p_tenant_id: tenantId })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setBrand((prev) => ({ ...prev, brandLoading: false }));
          return;
        }

        const row = data[0];
        const companyName = row.company_name || null;
        // Derive display name: "CompanyName" > "Operations Intelligence"
        const displayName = companyName || 'Operations Intelligence';
        const primaryColor = row.brand_primary_color || null;
        const sidebarBg = row.brand_sidebar_bg || null;
        // Logo: explicit brand URL > null (components decide their own fallback)
        const logoUrl = row.brand_logo_url || null;
        const websiteUrl = row.brand_website_url || null;

        // Override CSS custom properties so all existing aa-blue / dark-nav
        // class references automatically pick up the tenant's brand color.
        if (primaryColor) {
          document.documentElement.style.setProperty('--color-aa-blue', primaryColor);
        }
        if (sidebarBg) {
          document.documentElement.style.setProperty('--color-dark-nav', sidebarBg);
        }

        // Set favicon to tenant logo
        if (logoUrl) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = logoUrl;
        }

        // Set page title: "CompanyName | Operations Intelligence"
        if (companyName) {
          document.title = `${companyName} | Operations Intelligence`;
        }

        setBrand({
          companyName,
          displayName,
          logoUrl,
          primaryColor,
          sidebarBg,
          websiteUrl,
          brandLoading: false,
        });
      });
  }, [tenantId]);

  // Keep the agent API layer in sync with the tenant's company name so
  // every callAgent / chatWithAgent automatically uses the right context.
  useEffect(() => {
    if (brand.companyName) {
      setTenantContext({ companyName: brand.companyName });
    }
  }, [brand.companyName]);

  return (
    <BrandingContext.Provider value={brand}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
