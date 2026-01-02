/**
 * RippleEmitter - Phase transition ripple rings
 *
 * Creates expanding ring ripples on breathing phase transitions:
 * - On inhale start: Subtle ring contracts inward toward globe
 * - On exhale start: Ring expands outward from globe
 *
 * Visual metaphor: "breath as ripple in pond"
 *
 * Uses animated THREE.Ring geometries with opacity fade.
 */

import { Ring } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';
import { useDisposeMaterials } from '../../hooks/useDisposeMaterials';

export interface RippleEmitterProps {
  /** Enable/disable ripple effect @default true */
  enabled?: boolean;
  /** Expansion speed (units/second) @default 2.0 */
  speed?: number;
  /** Maximum ripple opacity @default 0.3 */
  opacity?: number;
  /** Number of ripple rings per transition @default 3 */
  count?: number;
  /** Starting radius (around globe) @default 1.8 */
  startRadius?: number;
  /** Maximum radius before fade-out @default 8.0 */
  maxRadius?: number;
  /** Ripple ring color @default '#f8d0a8' */
  color?: string;
}

interface RippleState {
  id: number;
  radius: number;
  opacity: number;
  direction: 'inward' | 'outward';
  active: boolean;
}

/**
 * RippleEmitter - Renders breath-phase ripple rings
 *
 * Monitors breathing phase transitions and spawns expanding/contracting
 * ring ripples that fade as they travel.
 */
export function RippleEmitter({
  enabled = true,
  speed = 2.0,
  opacity = 0.3,
  count = 3,
  startRadius = 1.8,
  maxRadius = 8.0,
  color = '#f8d0a8',
}: RippleEmitterProps) {
  const world = useWorld();
  const prevPhaseTypeRef = useRef<number>(-1);
  const rippleIdRef = useRef(0);
  const [ripples, setRipples] = useState<RippleState[]>([]);

  // Create ring material
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [color],
  );

  // Cleanup material on unmount
  useDisposeMaterials([material]);

  // Monitor phase transitions to spawn ripples
  useFrame(() => {
    if (!enabled) return;

    try {
      const breathEntity = world.queryFirst(phaseType, breathPhase);
      if (!breathEntity) return;

      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

      // Detect phase transitions
      if (prevPhaseTypeRef.current !== -1 && prevPhaseTypeRef.current !== currentPhaseType) {
        // Inhale start (0) or Exhale start (2) triggers ripples
        if (currentPhaseType === 0 || currentPhaseType === 2) {
          const direction = currentPhaseType === 0 ? 'inward' : 'outward';

          // Spawn multiple ripples with staggered timing
          const newRipples: RippleState[] = [];
          for (let i = 0; i < count; i++) {
            newRipples.push({
              id: rippleIdRef.current++,
              radius: direction === 'outward' ? startRadius : maxRadius * 0.6,
              opacity: opacity * (1 - i * 0.2), // Stagger opacity
              direction,
              active: true,
            });
          }

          setRipples((prev) => [...prev.filter((r) => r.active), ...newRipples]);
        }
      }

      prevPhaseTypeRef.current = currentPhaseType;
    } catch {
      // Ignore ECS errors during unmount
    }
  });

  // Animate ripples
  useFrame((_, delta) => {
    if (!enabled || ripples.length === 0) return;

    setRipples((prev) =>
      prev
        .map((ripple) => {
          if (!ripple.active) return ripple;

          let newRadius = ripple.radius;
          let newOpacity = ripple.opacity;

          if (ripple.direction === 'outward') {
            // Expand outward
            newRadius += speed * delta;
            // Fade as it expands
            const progress = (newRadius - startRadius) / (maxRadius - startRadius);
            newOpacity = opacity * (1 - progress);
          } else {
            // Contract inward
            newRadius -= speed * delta * 0.7; // Slower inward
            // Fade as it contracts
            const progress = 1 - newRadius / (maxRadius * 0.6);
            newOpacity = opacity * (1 - progress);
          }

          // Mark inactive when fully faded or out of bounds
          const shouldDeactivate =
            newOpacity <= 0.01 ||
            (ripple.direction === 'outward' && newRadius >= maxRadius) ||
            (ripple.direction === 'inward' && newRadius <= startRadius * 0.5);

          return {
            ...ripple,
            radius: newRadius,
            opacity: Math.max(0, newOpacity),
            active: !shouldDeactivate,
          };
        })
        .filter((r) => r.active || r.opacity > 0.01),
    );
  });

  if (!enabled) return null;

  return (
    <group name="Ripple Emitter">
      {ripples.map((ripple) => (
        <Ring
          key={ripple.id}
          args={[ripple.radius, ripple.radius + 0.05, 64]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={ripple.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </Ring>
      ))}
    </group>
  );
}

export default RippleEmitter;
