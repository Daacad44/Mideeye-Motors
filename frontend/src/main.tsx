import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import { loadBranding } from './lib/branding';
import './index.css';

// Favicon + PWA manifest are generated from the OFFICIAL logo — no local asset.
loadBranding().then(({ logo, favicon: brandFavicon }) => {
  const logoUrl = brandFavicon?.url ?? logo?.url;
  if (!logoUrl) return;
  const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
  if (favicon) favicon.href = logoUrl;

  const manifest = {
    name: 'Mideeye Motors & Rental Car Co.',
    short_name: 'Mideeye Motors',
    description: 'Premium car rental in Somalia.',
    start_url: '/',
    display: 'standalone',
    background_color: '#061423',
    theme_color: '#061423',
    icons: [
      { src: logoUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = URL.createObjectURL(blob);
  document.head.appendChild(link);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
