import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { RootProviders } from './providers';

// biome-ignore lint/style/noNonNullAssertion: Root element is guaranteed to exist in HTML (checked at build time by indexhtml)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootProviders>
      <App />
    </RootProviders>
  </StrictMode>,
);
