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

// Start app with proper error handling
startApp().catch((error) => {
  console.error('[App] Failed to start:', error);
  // Show user-friendly error message
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; padding: 2rem;">
        <div style="max-width: 500px; text-align: center;">
          <h1 style="color: #ef4444; margin-bottom: 1rem;">Failed to start application</h1>
          <p style="color: #6b7280; margin-bottom: 1rem;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer;">Reload</button>
        </div>
      </div>
    `;
  }
});
