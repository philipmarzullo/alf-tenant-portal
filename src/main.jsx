import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BrandingProvider } from './contexts/BrandingContext';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { TenantConfigProvider } from './contexts/TenantConfigContext';
import { DashboardConfigProvider } from './contexts/DashboardConfigContext';
import { RBACProvider } from './contexts/RBACContext';
import { CustomToolsProvider } from './contexts/CustomToolsContext';
import { TenantPortalProvider } from './contexts/TenantPortalContext';
import ToastProvider from './components/shared/ToastProvider';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BrandingProvider>
        <TenantPortalProvider>
          <AuthProvider>
            <UserProvider>
              <RBACProvider>
                <TenantConfigProvider>
                  <CustomToolsProvider>
                    <DashboardConfigProvider>
                      <ToastProvider>
                        <App />
                      </ToastProvider>
                    </DashboardConfigProvider>
                  </CustomToolsProvider>
                </TenantConfigProvider>
              </RBACProvider>
            </UserProvider>
          </AuthProvider>
        </TenantPortalProvider>
      </BrandingProvider>
    </BrowserRouter>
  </StrictMode>,
);
