import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { setTenantContext } from '../agents/api';

const BrandingContext = createContext(null);

const TENANT_ID = import.meta.env.VITE_TENANT_ID || null;

export function BrandingProvider({ children }) {
  const [brand, setBrand] = useState({
    companyName: null,
    displayName: 'Operations Portal',
    logoUrl: null,
    primaryColor: null,
    sidebarBg: null,
    brandLoading: true,
  });

  useEffect(() => {
    if (!supabase || !TENANT_ID) {
      setBrand((prev) => ({ ...prev, brandLoading: false }));
      return;
    }

    supabase
      .rpc('get_tenant_branding', { p_tenant_id: TENANT_ID })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setBrand((prev) => ({ ...prev, brandLoading: false }));
          return;
        }

        const row = data[0];
        const companyName = row.company_name || null;
        // Derive display name: explicit brand name > "CompanyName Portal" > "Operations Portal"
        const displayName = row.brand_display_name
          || (companyName ? `${companyName} Portal` : 'Operations Portal');
        const primaryColor = row.brand_primary_color || null;
        const sidebarBg = row.brand_sidebar_bg || null;
        // Logo: explicit brand URL > null (components decide their own fallback)
        const logoUrl = row.brand_logo_url || null;

        // Override CSS custom properties so all existing aa-blue / dark-nav
        // class references automatically pick up the tenant's brand color.
        if (primaryColor) {
          document.documentElement.style.setProperty('--color-aa-blue', primaryColor);
        }
        if (sidebarBg) {
          document.documentElement.style.setProperty('--color-dark-nav', sidebarBg);
        }

        setBrand({
          companyName,
          displayName,
          logoUrl,
          primaryColor,
          sidebarBg,
          brandLoading: false,
        });
      });
  }, []);

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
