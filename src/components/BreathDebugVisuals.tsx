/**
 * Breath Debug Visualizations
 * Renders optional debug overlays for breathing system tweaking:
 * - Orbit bounds wireframes (min/max particle orbits)
 * - Phase transition markers (colored rings at cardinal points)
 * - Real-time trait values overlay
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef, useState } from 'react';
import type * as THREE from 'three';
import { VISUALS } from '../constants';
import { breathPhase, orbitRadius, phaseType, sphereScale } from '../entities/breath/traits';

interface BreathDebugVisualsProps {
  /**
   * Show orbit radius bounds (min/max wireframes)
   * Green = min orbit (1.5), Red = max orbit (3.5), Yellow = current orbit
   */
  showOrbitBounds?: boolean;

  /**
   * Show phase transition markers (colored rings)
   * Green = Inhale, Blue = Hold-in, Red = Exhale, Yellow = Hold-out
   */
  showPhaseMarkers?: boolean;

  /**
   * Show real-time trait values overlay
   * Displays phase, phase type, orbit, and scale
   */
  showTraitValues?: boolean;
}

interface TraitValues {
  phase: number;
  orbit: number;
  scale: number;
  phaseType: number;
}

/**
 * Visual debug component for breathing system
 * Renders conditional visualization overlays
 */
export function BreathDebugVisuals({
  showOrbitBounds = false,
  showPhaseMarkers = false,
  showTraitValues = false,
}: BreathDebugVisualsProps) {
  const world = useWorld();

  // Store current values in ref to avoid repeated object allocations
  const valuesRef = useRef<TraitValues>({
    phase: 0,
    orbit: VISUALS.PARTICLE_ORBIT_MAX,
    scale: 1,
    phaseType: 0,
  });

  // Use state for Html overlay only (needed for DOM updates), ref for Three.js visuals
  const [, setForceUpdate] = useState(0);

  // Update values every frame
  useFrame(() => {
    try {
      const breath = world.queryFirst(breathPhase, orbitRadius, sphereScale, phaseType);
      if (!breath || !world.has(breath)) return;

      valuesRef.current = {
        phase: breath.get(breathPhase)?.value ?? 0,
        orbit: breath.get(orbitRadius)?.value ?? VISUALS.PARTICLE_ORBIT_MAX,
        scale: breath.get(sphereScale)?.value ?? 1,
        phaseType: breath.get(phaseType)?.value ?? 0,
      };

      // Throttle HTML updates to every 4 frames (~15fps) instead of 60fps
      if (Math.random() < 0.25) setForceUpdate((v) => v + 1);
    } catch (_e) {
      // Ignore stale world errors
    }
  });

  const orbitsRef = useRef<THREE.Group>(null);
  const markersRef = useRef<THREE.Group>(null);

  return (
    <group>
      {/* ============================================================
        ORBIT BOUNDS VISUALIZATIONS
        Shows min/max particle orbit radii and current orbit
        ============================================================ */}
      {showOrbitBounds && (
        <group ref={orbitsRef}>
          {/* Min orbit (Inhale - particles closest to surface) */}
          <mesh>
            <sphereGeometry args={[VISUALS.PARTICLE_ORBIT_MIN, 32, 32]} />
            <meshBasicMaterial color="#00ff00" wireframe opacity={0.3} transparent />
          </mesh>

          {/* Max orbit (Exhale - particles farthest from surface) */}
          <mesh>
            <sphereGeometry args={[VISUALS.PARTICLE_ORBIT_MAX, 32, 32]} />
            <meshBasicMaterial color="#ff0000" wireframe opacity={0.3} transparent />
          </mesh>

          {/* Current orbit (updates based on breath phase) */}
          <mesh>
            <sphereGeometry args={[valuesRef.current.orbit, 32, 32]} />
            <meshBasicMaterial color="#ffff00" wireframe opacity={0.5} transparent />
          </mesh>
        </group>
      )}

      {/* ============================================================
        PHASE MARKERS
        Colored torus rings at cardinal points indicating phase positions
        ============================================================ */}
      {showPhaseMarkers && (
        <group ref={markersRef}>
          {/* Inhale marker (0) - Green (top) */}
          <mesh position={[0, 2, 0]}>
            <torusGeometry args={[0.3, 0.05, 16, 32]} />
            <meshBasicMaterial
              color={valuesRef.current.phaseType === 0 ? '#00ff00' : '#003300'}
              toneMapped={false}
            />
          </mesh>

          {/* Hold-in marker (1) - Blue (right) */}
          <mesh position={[2, 0, 0]}>
            <torusGeometry args={[0.3, 0.05, 16, 32]} />
            <meshBasicMaterial
              color={valuesRef.current.phaseType === 1 ? '#0000ff' : '#000033'}
              toneMapped={false}
            />
          </mesh>

          {/* Exhale marker (2) - Red (bottom) */}
          <mesh position={[0, -2, 0]}>
            <torusGeometry args={[0.3, 0.05, 16, 32]} />
            <meshBasicMaterial
              color={valuesRef.current.phaseType === 2 ? '#ff0000' : '#330000'}
              toneMapped={false}
            />
          </mesh>

          {/* Hold-out marker (3) - Yellow (left) */}
          <mesh position={[-2, 0, 0]}>
            <torusGeometry args={[0.3, 0.05, 16, 32]} />
            <meshBasicMaterial
              color={valuesRef.current.phaseType === 3 ? '#ffff00' : '#333300'}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* ============================================================
        TRAIT VALUES OVERLAY
        Real-time numerical display of breath state
        ============================================================ */}
      {showTraitValues && (
        <Html position={[0, 4, 0]} distanceFactor={1}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              color: '#00ff00',
              padding: '12px 16px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.6',
              border: '1px solid #00ff00',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            <div>Phase: {valuesRef.current.phase.toFixed(3)}</div>
            <div>
              Type: {['Inhale', 'Hold-in', 'Exhale', 'Hold-out'][valuesRef.current.phaseType]}
            </div>
            <div>Orbit: {valuesRef.current.orbit.toFixed(2)}</div>
            <div>Scale: {valuesRef.current.scale.toFixed(2)}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
