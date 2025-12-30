import { useFrame } from '@react-three/fiber';
import { createWorld } from 'koota';
import { useWorld, WorldProvider } from 'koota/react';
import { createContext, type ReactNode, use, useMemo } from 'react';
import { breathSystem } from './entities/breath/systems';

export function RootProviders({ children }: { children: ReactNode }) {
  const world = useMemo(() => createWorld(), []);

  return <WorldProvider world={world}>{children}</WorldProvider>;
}

const NestedCheck = createContext(false);

export function KootaSystems({
  breathSystemEnabled = true,
  children,
}: {
  breathSystemEnabled?: boolean;
  children: ReactNode;
}) {
  const isNested = use(NestedCheck);
  const world = useWorld();

  useFrame((_state, delta) => {
    if (isNested) {
      // This turns off the systems if they are already running in a parent component.
      // This can happen when running inside Triplex as the systems are running in the CanvasProvider.
      return;
    }

    try {
      if (breathSystemEnabled) {
        breathSystem(world, delta);
      }
    } catch (error) {
      // Silently catch ECS errors during unmount/remount in Triplex
      // This prevents the "data_7_$f.store" crash when the world is stale
      if (import.meta.env.DEV) {
        console.warn('[breathSystem] ECS error (expected during Triplex hot-reload):', error);
      }
    }
  });

  return <NestedCheck.Provider value={true}>{children}</NestedCheck.Provider>;
}
