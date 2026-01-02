/**
 * UserPositionContext - Shared state for current user's 3D position
 *
 * Allows ParticleSwarm to publish position updates and YouMarker to consume them.
 * Uses a ref-based approach for performance (no React re-renders on position changes).
 *
 * Architecture:
 * - ParticleSwarm calls updatePosition() in its animation loop
 * - YouMarker reads positionRef in its own animation loop
 * - Position is updated at 60fps, throttled writes to avoid GC pressure
 */

import { createContext, type ReactNode, useContext, useRef } from 'react';
import * as THREE from 'three';

export interface UserPositionState {
  /** Current 3D position of the user's shard (updated every frame) */
  position: THREE.Vector3;
  /** Whether the user's shard is currently visible */
  isVisible: boolean;
  /** Current scale of the user's shard (0-1 during animations) */
  scale: number;
  /** Slot index of the user in the SlotManager */
  slotIndex: number;
}

interface UserPositionContextValue {
  /** Ref to current position state (read in animation loops) */
  positionRef: React.RefObject<UserPositionState>;
  /** Update position from ParticleSwarm animation loop */
  updatePosition: (
    position: THREE.Vector3,
    isVisible: boolean,
    scale: number,
    slotIndex: number,
  ) => void;
}

const UserPositionContext = createContext<UserPositionContextValue | null>(null);

export function UserPositionProvider({ children }: { children: ReactNode }) {
  // Use ref for position to avoid re-renders on every frame update
  const positionRef = useRef<UserPositionState>({
    position: new THREE.Vector3(),
    isVisible: false,
    scale: 0,
    slotIndex: -1,
  });

  // Pre-allocate temp vector to avoid GC pressure
  const updatePosition = (
    position: THREE.Vector3,
    isVisible: boolean,
    scale: number,
    slotIndex: number,
  ) => {
    const state = positionRef.current;
    if (state) {
      state.position.copy(position);
      state.isVisible = isVisible;
      state.scale = scale;
      state.slotIndex = slotIndex;
    }
  };

  return (
    <UserPositionContext.Provider value={{ positionRef, updatePosition }}>
      {children}
    </UserPositionContext.Provider>
  );
}

export function useUserPosition() {
  const context = useContext(UserPositionContext);
  if (!context) {
    throw new Error('useUserPosition must be used within a UserPositionProvider');
  }
  return context;
}

/**
 * Optional version of useUserPosition that returns null if context is not available.
 * Use this in components that may render outside the UserPositionProvider.
 */
export function useUserPositionOptional() {
  return useContext(UserPositionContext);
}
