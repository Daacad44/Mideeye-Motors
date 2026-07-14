import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import { cld } from './lib/cloudinary';
import { LOGO_PUBLIC_ID } from './lib/brand';
import './index.css';

// Favicon comes from the official Cloudinary logo — no local asset.
const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
if (favicon) favicon.href = cld(LOGO_PUBLIC_ID, { width: 64, height: 64, crop: 'fit' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
