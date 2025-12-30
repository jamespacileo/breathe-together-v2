import React from 'react';
import { RootProviders, KootaSystems } from '../src/providers';
import { BreathEntity } from '../src/entities/breath';

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  return <RootProviders>{children}</RootProviders>;
}

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  return (
    <KootaSystems>
      <BreathEntity />
      {children}
    </KootaSystems>
  );
}
