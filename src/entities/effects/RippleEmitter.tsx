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
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType } from '../breath/traits';

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

/** Create new ripples for a phase transition */
function createRipples(
  count: number,
  direction: 'inward' | 'outward',
  opacity: number,
  startRadius: number,
  maxRadius: number,
  idRef: React.MutableRefObject<number>,
): RippleState[] {
  const newRipples: RippleState[] = [];
  for (let i = 0; i < count; i++) {
    newRipples.push({
      id: idRef.current++,
      radius: direction === 'outward' ? startRadius : maxRadius * 0.6,
      opacity: opacity * (1 - i * 0.2), // Stagger opacity
      direction,
      active: true,
    });
  }
  return newRipples;
}

/** Animate a single ripple and return updated state */
function animateRipple(
  ripple: RippleState,
  delta: number,
  speed: number,
  opacity: number,
  startRadius: number,
  maxRadius: number,
): RippleState {
  if (!ripple.active) return ripple;

  let newRadius = ripple.radius;
  let newOpacity = ripple.opacity;

  if (ripple.direction === 'outward') {
    newRadius += speed * delta;
    const progress = (newRadius - startRadius) / (maxRadius - startRadius);
    newOpacity = opacity * (1 - progress);
  } else {
    newRadius -= speed * delta * 0.7;
    const progress = 1 - newRadius / (maxRadius * 0.6);
    newOpacity = opacity * (1 - progress);
  }

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

      // Detect phase transitions - inhale (0) or exhale (2) triggers ripples
      const isPhaseTransition =
        prevPhaseTypeRef.current !== -1 && prevPhaseTypeRef.current !== currentPhaseType;
      const isRippleTrigger = currentPhaseType === 0 || currentPhaseType === 2;

      if (isPhaseTransition && isRippleTrigger) {
        const direction = currentPhaseType === 0 ? 'inward' : 'outward';
        const newRipples = createRipples(
          count,
          direction,
          opacity,
          startRadius,
          maxRadius,
          rippleIdRef,
        );
        setRipples((prev) => [...prev.filter((r) => r.active), ...newRipples]);
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
        .map((ripple) => animateRipple(ripple, delta, speed, opacity, startRadius, maxRadius))
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
