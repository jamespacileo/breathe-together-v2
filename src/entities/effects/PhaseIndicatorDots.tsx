import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_TOTAL_CYCLE } from '../../constants';
import { calculatePhaseInfo } from '../../lib/breathPhase';

/**
 * Phase configuration - 3 phases shown (no hold-out in 4-7-8)
 * Positioned at 120° intervals around the globe
 */
const PHASES = [
  { name: 'Inhale', angle: -90, index: 0, color: '#7ec8d4' }, // Top
  { name: 'Hold', angle: 30, index: 1, color: '#d4a574' }, // Bottom-right
  { name: 'Exhale', angle: 150, index: 2, color: '#d4847e' }, // Bottom-left
];

export interface PhaseIndicatorDotsProps {
  /** Enable/disable the dots */
  enabled?: boolean;
  /** Distance from center */
  radius?: number;
  /** Dot size when inactive */
  dotSizeInactive?: number;
  /** Dot size when active (current phase) */
  dotSizeActive?: number;
  /** Opacity when inactive */
  opacityInactive?: number;
  /** Opacity when active */
  opacityActive?: number;
  /** Show phase labels */
  showLabels?: boolean;
  /** Label font size */
  labelSize?: number;
  /** Vertical offset */
  yOffset?: number;
}

/**
 * PhaseIndicatorDots - Three dots showing which breathing phase is active.
 *
 * Positioned at 120° intervals around the globe, these minimal indicators
 * show the current phase without numbers or timers. The active phase dot
 * grows larger and brighter, while inactive dots remain subtle.
 *
 * Optional labels ("Inhale", "Hold", "Exhale") can be shown for clarity.
 */
export function PhaseIndicatorDots({
  enabled = true,
  radius = 4.2,
  dotSizeInactive = 0.08,
  dotSizeActive = 0.15,
  opacityInactive = 0.3,
  opacityActive = 0.9,
  showLabels = true,
  labelSize = 0.18,
  yOffset = 0,
}: PhaseIndicatorDotsProps) {
  // Refs for each dot mesh and material
  const dotRefs = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([null, null, null]);
  const labelRefs = useRef<(THREE.Object3D | null)[]>([null, null, null]);

  // Create geometries (shared)
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);

  // Cleanup
  useMemo(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!enabled) return;

    const time = clock.getElapsedTime();

    // Use UTC time for global synchronization
    const utcTime = Date.now() / 1000;
    const cycleTime = utcTime % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

    // Update each dot
    for (let i = 0; i < PHASES.length; i++) {
      const dot = dotRefs.current[i];
      const mat = materialRefs.current[i];
      const label = labelRefs.current[i];

      if (!dot || !mat) continue;

      const isActive = phaseIndex === PHASES[i].index;

      // Animate size
      const targetSize = isActive ? dotSizeActive : dotSizeInactive;
      const currentSize = dot.scale.x;
      const newSize = THREE.MathUtils.lerp(currentSize, targetSize, 0.15);

      // Add pulse effect for active dot
      const pulseAmount = isActive ? Math.sin(time * 4) * 0.02 : 0;
      dot.scale.setScalar(newSize + pulseAmount);

      // Animate opacity
      const targetOpacity = isActive ? opacityActive : opacityInactive;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.15);

      // Update label opacity if visible
      if (label && showLabels) {
        const labelTargetOpacity = isActive ? 1 : 0.4;
        // Access the material through the mesh
        const labelMesh = label as THREE.Mesh;
        if (labelMesh.material && 'opacity' in labelMesh.material) {
          (labelMesh.material as THREE.Material).opacity = THREE.MathUtils.lerp(
            (labelMesh.material as THREE.Material).opacity,
            labelTargetOpacity,
            0.1,
          );
        }
      }

      // Add glow effect for active dot (scale inner white core)
      if (isActive && phaseProgress < 0.1) {
        // Brief "pop" at phase start
        const popScale = 1 + (0.1 - phaseProgress) * 3;
        dot.scale.multiplyScalar(popScale);
      }
    }
  });

  if (!enabled) return null;

  return (
    <group position={[0, yOffset, 0]}>
      {PHASES.map((phase, i) => {
        // Calculate position from angle
        const angleRad = (phase.angle * Math.PI) / 180;
        const x = Math.cos(angleRad) * radius;
        const z = Math.sin(angleRad) * radius;

        return (
          <group key={phase.name} position={[x, 0, z]}>
            {/* Dot */}
            <mesh
              ref={(el) => {
                dotRefs.current[i] = el;
              }}
              scale={dotSizeInactive}
            >
              <primitive object={geometry} attach="geometry" />
              <meshBasicMaterial
                ref={(el) => {
                  materialRefs.current[i] = el;
                }}
                color={phase.color}
                transparent
                opacity={opacityInactive}
                depthWrite={false}
              />
            </mesh>

            {/* Label */}
            {showLabels && (
              <Text
                ref={(el) => {
                  labelRefs.current[i] = el;
                }}
                position={[0, 0.35, 0]}
                fontSize={labelSize}
                color={phase.color}
                anchorX="center"
                anchorY="middle"
                fillOpacity={0.4}
                outlineWidth={0.01}
                outlineColor="#000000"
                outlineOpacity={0.3}
              >
                {phase.name}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );
}
