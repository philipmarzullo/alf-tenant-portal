import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
        const displayName = row.brand_display_name || 'Operations Portal';
        const primaryColor = row.brand_primary_color || null;
        const sidebarBg = row.brand_sidebar_bg || null;

        // Override CSS custom properties so all existing aa-blue / dark-nav
        // class references automatically pick up the tenant's brand color.
        if (primaryColor) {
          document.documentElement.style.setProperty('--color-aa-blue', primaryColor);
        }
        if (sidebarBg) {
          document.documentElement.style.setProperty('--color-dark-nav', sidebarBg);
        }

        setBrand({
          companyName: row.company_name || null,
          displayName,
          logoUrl: row.brand_logo_url || null,
          primaryColor,
          sidebarBg,
          brandLoading: false,
        });
      });
  }, []);

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
