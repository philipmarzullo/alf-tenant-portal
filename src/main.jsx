import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BrandingProvider } from './contexts/BrandingContext';
import { AuthProvider } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { TenantConfigProvider } from './contexts/TenantConfigContext';
import ToastProvider from './components/shared/ToastProvider';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BrandingProvider>
        <AuthProvider>
          <UserProvider>
            <TenantConfigProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </TenantConfigProvider>
          </UserProvider>
        </AuthProvider>
      </BrandingProvider>
    </BrowserRouter>
  </StrictMode>,
);
