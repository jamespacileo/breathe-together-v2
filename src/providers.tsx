import { useFrame } from '@react-three/fiber';
import { createWorld } from 'koota';
import { useWorld, WorldProvider } from 'koota/react';
import { createContext, type ReactNode, use, useMemo } from 'react';
import { breathSystem } from './entities/breath/systems';
import { particleColorSystem, particlePhysicsSystem } from './entities/particle/systems';

export function RootProviders({ children }: { children: ReactNode }) {
  const world = useMemo(() => createWorld(), []);

  return <WorldProvider world={world}>{children}</WorldProvider>;
}

const NestedCheck = createContext(false);

export function KootaSystems({
  breathSystemEnabled = true,
  children,
  particlePhysicsSystemEnabled = true,
}: {
  breathSystemEnabled?: boolean;
  children: ReactNode;
  particlePhysicsSystemEnabled?: boolean;
}) {
  const isNested = use(NestedCheck);
  const world = useWorld();
  const particlePhysics = useMemo(() => particlePhysicsSystem(world), [world]);
  const particleColor = useMemo(() => particleColorSystem(world), [world]);

  useFrame((state, delta) => {
    if (isNested) {
      // This turns off the systems if they are already running in a parent component.
      // This can happen when running inside Triplex as the systems are running in the CanvasProvider.
      return;
    }

    try {
      if (breathSystemEnabled) {
        breathSystem(world, delta);
      }

      if (particlePhysicsSystemEnabled) {
        particlePhysics(delta, state.clock.elapsedTime);
        particleColor(delta);
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount in Triplex
      // This prevents the "data_7_$f.store" crash when the world is stale
    }
  });

  return <NestedCheck.Provider value={true}>{children}</NestedCheck.Provider>;
}
