import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { RootProviders } from './providers';
// Global UI styles (animations, range sliders, button focus states)
import './styles/ui.css';
// WebGL API validation in development mode
import './lib/webgl-lint-setup';

async function startApp() {
  // Start MSW in development mode when VITE_USE_MSW=true
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true') {
    const { startMSW } = await import('./mocks/browser');
    // biome-ignore lint/nursery/useAwaitThenable: startMSW() is async (calls worker.start() which returns Promise)
    await startMSW();
  }

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <RootProviders>
        <App />
      </RootProviders>
    </StrictMode>,
  );
}

// Fire-and-forget async initialization - errors logged internally
void startApp();
