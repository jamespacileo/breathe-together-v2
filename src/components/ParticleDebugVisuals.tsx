/**
 * Particle Debug Visualizations
 *
 * Renders overlay diagnostics for particle debugging:
 * - Particle stats overlay (user/filler counts, active status)
 * - Particle type visualization (wireframe orbit indicators)
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { index, active, ownerId } from '../entities/particle/traits';

interface ParticleStats {
  totalParticles: number;
  userParticles: number;
  fillerParticles: number;
  activeParticles: number;
  userActive: number;
  fillerActive: number;
}

interface ParticleDebugVisualsProps {
  /** Show particle type visualization (wireframe orbit indicators) */
  showParticleTypes?: boolean;

  /** Show particle statistics overlay */
  showParticleStats?: boolean;
}

/**
 * ParticleDebugVisuals
 *
 * Renders real-time particle debugging information:
 *
 * **Stats Overlay:**
 * - Total particles, user/filler split
 * - Active particle count (respects adaptive quality)
 * - Updates every frame
 *
 * **Type Visualization:**
 * - Wireframe sphere at user orbit min/max
 * - Wireframe sphere at filler orbit min/max (if different from user)
 * - Color-coded: green=user, red=filler
 *
 * Performance: Only updates when showParticleStats or showParticleTypes enabled
 */
export function ParticleDebugVisuals({
  showParticleTypes = false,
  showParticleStats = false,
}: ParticleDebugVisualsProps) {
  const world = useWorld();
  const { camera } = useThree();
  const [stats, setStats] = useState<ParticleStats>({
    totalParticles: 0,
    userParticles: 0,
    fillerParticles: 0,
    activeParticles: 0,
    userActive: 0,
    fillerActive: 0,
  });

  const wireframeGroupRef = useRef<THREE.Group>(null);
  const userWireframeRef = useRef<THREE.LineSegments>(null);
  const fillerWireframeRef = useRef<THREE.LineSegments>(null);

  // Create wireframe spheres for orbit visualization
  const { userWireframeGeom, fillerWireframeGeom } = useMemo(() => {
    // User particle orbit: radius 1.5-3.5
    // Filler particle orbit: same (both rendered at same orbits for visual consistency)
    const createWireframeGeometry = (radius: number) => {
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      return new THREE.EdgesGeometry(geometry);
    };

    return {
      userWireframeGeom: createWireframeGeometry(3.5), // Max orbit radius for user particles
      fillerWireframeGeom: createWireframeGeometry(1.5), // Min orbit radius for filler particles
    };
  }, []);

  // Update particle stats every frame
  useFrame(() => {
    if (!showParticleStats && !showParticleTypes) return;

    const particles = world.query(index, ownerId, active);

    let totalCount = 0;
    let userCount = 0;
    let fillerCount = 0;
    let activeCount = 0;
    let userActiveCount = 0;
    let fillerActiveCount = 0;

    particles.forEach((entity) => {
      const ownerIdTrait = entity.get(ownerId);
      const activeTrait = entity.get(active);

      if (!ownerIdTrait) return;

      const isUser = ownerIdTrait.value === 'user';
      const isActive = activeTrait?.value ?? true;

      totalCount++;
      if (isUser) {
        userCount++;
        if (isActive) userActiveCount++;
      } else {
        fillerCount++;
        if (isActive) fillerActiveCount++;
      }
      if (isActive) activeCount++;
    });

    setStats({
      totalParticles: totalCount,
      userParticles: userCount,
      fillerParticles: fillerCount,
      activeParticles: activeCount,
      userActive: userActiveCount,
      fillerActive: fillerActiveCount,
    });
  });

  // Don't render anything if debug visualizations are disabled
  if (!showParticleTypes && !showParticleStats) {
    return null;
  }

  return (
    <>
      {/* Wireframe orbit visualization */}
      {showParticleTypes && (
        <group ref={wireframeGroupRef}>
          {/* User particle orbit (green) */}
          <lineSegments
            ref={userWireframeRef}
            geometry={userWireframeGeom}
            position={[0, 0, 0]}
          >
            <lineBasicMaterial color={0x00ff00} transparent opacity={0.3} />
          </lineSegments>

          {/* Filler particle orbit (red) */}
          <lineSegments
            ref={fillerWireframeRef}
            geometry={fillerWireframeGeom}
            position={[0, 0, 0]}
          >
            <lineBasicMaterial color={0xff0000} transparent opacity={0.3} />
          </lineSegments>
        </group>
      )}

      {/* Statistics overlay */}
      {showParticleStats && (
        <Html
          position={[0, 0, 0]}
          distanceFactor={camera.position.z}
          scale={1}
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(0, 255, 0, 0.3)',
              borderRadius: '4px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#0f0',
              lineHeight: '1.6',
              userSelect: 'none',
            }}
          >
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#0f0' }}>
              PARTICLE DEBUG
            </div>

            <div style={{ color: '#ccc', marginBottom: '4px' }}>
              Total: {stats.totalParticles}
            </div>

            <div style={{ color: '#00ff00' }}>
              User: {stats.userParticles} ({stats.userActive} active)
            </div>

            <div style={{ color: '#ff6666' }}>
              Filler: {stats.fillerParticles} ({stats.fillerActive} active)
            </div>

            <div style={{ color: '#ffff00', marginTop: '4px', marginBottom: '4px' }}>
              Active: {stats.activeParticles}/{stats.totalParticles}
            </div>

            {stats.activeParticles < stats.totalParticles && (
              <div style={{ color: '#ff6666', fontSize: '11px' }}>
                ⚠️ Quality throttled
              </div>
            )}
          </div>
        </Html>
      )}
    </>
  );
}
