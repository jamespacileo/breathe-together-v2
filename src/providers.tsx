import { useFrame } from '@react-three/fiber';
import { createWorld } from 'koota';
import { useWorld, WorldProvider } from 'koota/react';
import { createContext, type ReactNode, use, useMemo } from 'react';
import { cameraFollowFocused } from '../src/entities/camera/systems';
import { velocityTowardsTarget } from '../src/entities/controller/systems';
import { useCursorPositionFromLand } from '../src/entities/land/systems';
import { meshFromPosition, positionFromVelocity } from '../src/shared/systems';
import { breathSystem } from './entities/breath/systems';
import { particlePhysicsSystem } from './entities/particle/systems';

export function RootProviders({ children }: { children: ReactNode }) {
  const world = useMemo(() => createWorld(), []);

  return <WorldProvider world={world}>{children}</WorldProvider>;
}

const NestedCheck = createContext(false);

export function KootaSystems({
  breathSystemEnabled = true,
  cameraFollowFocusedSystem = true,
  children,
  cursorPositionFromLandSystem = true,
  positionFromVelocitySystem = true,
  velocityTowardsTargetSystem = true,
  particlePhysicsSystemEnabled = true,
}: {
  breathSystemEnabled?: boolean;
  cameraFollowFocusedSystem?: boolean;
  children: ReactNode;
  cursorPositionFromLandSystem?: boolean;
  positionFromVelocitySystem?: boolean;
  velocityTowardsTargetSystem?: boolean;
  particlePhysicsSystemEnabled?: boolean;
}) {
  const isNested = use(NestedCheck);
  const world = useWorld();
  const cursorPositionFromLand = useCursorPositionFromLand();
  const particlePhysics = useMemo(() => particlePhysicsSystem(world), [world]);

  useFrame((state, delta) => {
    if (isNested) {
      // This turns off the systems if they are already running in a parent component.
      // This can happen when running inside Triplex as the systems are running in the CanvasProvider.
      return;
    }

    // ============================================================
    // SYSTEM EXECUTION ORDER - Order is critical for correct behavior
    // ============================================================
    //
    // The ECS systems run in a strict sequence to ensure data dependencies are satisfied.
    // Each phase depends on the output of the previous phase(s).
    //
    // PHASE 1: LOGIC - Calculate global state (source of truth)
    // ────────────────────────────────────────────────────────────
    // Breath system runs FIRST to compute global breathing state.
    // Uses UTC time (Date.now()) for global synchronization.
    // Outputs: breathPhase, phaseType, orbitRadius, sphereScale, crystallization
    // These outputs are consumed by particle physics and animations.
    if (breathSystemEnabled) {
      breathSystem(world, delta);
    }

    // PHASE 2: PHYSICS - Simulate particle dynamics
    // ────────────────────────────────────────────────────────────
    // Particle physics runs IMMEDIATELY after breath system.
    // It reads the freshly-computed breath state (orbitRadius, sphereScale, crystallization).
    // Outputs: Particle Position and Velocity traits
    // Must run early to avoid stale breath state values.
    if (particlePhysicsSystemEnabled) {
      particlePhysics(delta, state.clock.elapsedTime);
    }

    // PHASE 3: INPUT - Ray-cast and target tracking
    // ────────────────────────────────────────────────────────────
    // Cursor position from land: Ray-casts from camera to find cursor position.
    // Outputs: Cursor Position trait
    if (cursorPositionFromLandSystem) {
      cursorPositionFromLand(world, delta);
    }

    // PHASE 4: FORCES - Apply movement toward targets
    // ────────────────────────────────────────────────────────────
    // Velocity towards target: Reads target position (cursor), sets velocity toward it.
    // Outputs: Controllable entity Velocity trait
    // Depends on: Cursor position from phase 3
    if (velocityTowardsTargetSystem) {
      velocityTowardsTarget(world, delta);
    }

    // PHASE 5: INTEGRATION - Apply physics to positions
    // ────────────────────────────────────────────────────────────
    // Position from velocity: Integrates velocity into position.
    // Reads: Velocity (from both particle physics AND velocity towards target)
    // Outputs: Updated Position traits
    // Must run after all force/velocity updates are complete.
    if (positionFromVelocitySystem) {
      positionFromVelocity(world, delta);
    }

    // PHASE 6: RENDER SYNC - Push ECS data to Three.js
    // ────────────────────────────────────────────────────────────
    // Mesh from position: Syncs ECS Position traits to Three.js mesh transforms.
    // Reads: Position traits (particle AND controllable entities)
    // Outputs: Three.js mesh.position and mesh.scale updates
    // ALWAYS RUNS (no toggle flag) - must reflect final positions.
    // Must run AFTER all position updates (particles, controllables, animations).
    meshFromPosition(world, delta);

    // PHASE 7: CAMERA - Follow focused entity
    // ────────────────────────────────────────────────────────────
    // Camera follow focused: Smoothly moves camera to follow a focused entity.
    // Reads: Focused entity Position (just updated by meshFromPosition)
    // Outputs: Camera Position trait
    // Runs LAST to ensure camera sees final entity positions.
    if (cameraFollowFocusedSystem) {
      cameraFollowFocused(world, delta);
    }
  });

  return <NestedCheck value>{children}</NestedCheck>;
}
