// ─────────────────────────────────────────────────────────────────────────────
// Entry point — mounts React app to DOM
// ─────────────────────────────────────────────────────────────────────────────

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ensureDatabaseReady } from './db/db';
import './index.css';

registerSW({ immediate: true });

async function bootstrap() {
  try {
    await ensureDatabaseReady();
  } catch (error) {
    console.error('Failed to initialize local database', error);
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
