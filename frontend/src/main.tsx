import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LocaleProvider } from './context/LocaleContext';
import App from './App';
import { loadBranding } from './lib/branding';
import './index.css';

// Favicon is set from the OFFICIAL logo at runtime. The installable PWA manifest
// (name/icons/theme) is now provided statically by vite-plugin-pwa — see
// vite.config.ts + public/ — so it no longer needs to be built here.
loadBranding().then(({ logo, favicon: brandFavicon }) => {
  const logoUrl = brandFavicon?.url ?? logo?.url;
  if (!logoUrl) return;
  const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
  if (favicon) favicon.href = logoUrl;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
);
