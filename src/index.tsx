import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { RootProviders } from './providers';

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
