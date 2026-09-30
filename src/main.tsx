import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './app/App';
import { appUpdatePolicy } from './app/update-policy';
import { bootstrapLanguage } from './lib/i18n';
import { registerServiceWorker } from './lib/pwa';
import { bootstrapTheme } from './lib/theme';

// Before the first paint, like the Svelte stores did at import time: `dark`/`glassmorphism`
// classes, `--color-primary` and `<html lang>`.
bootstrapTheme();
bootstrapLanguage();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerServiceWorker(appUpdatePolicy);
