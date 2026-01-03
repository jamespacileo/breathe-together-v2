/**
 * FloatingGeometry - Small geometric shapes orbiting lazily
 *
 * Features:
 * - Tiny geometric shapes (tetrahedra, octahedra, small icosahedra)
 * - Very slow orbital movement in various planes
 * - Breath-synchronized opacity and subtle rotation
 * - Muted pastel colors matching the Monument Valley aesthetic
 *
 * Visual style: Delicate geometric fragments adding subtle depth and interest
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

// Pre-allocated vectors for animation
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tempEuler = new THREE.Euler();

/**
 * Shape configurations - varied geometry types and colors
 */
const SHAPE_CONFIGS = [
  // Tetrahedra - warm tones
  { type: 'tetra', radius: 3.5, height: 0.3, size: 0.08, color: '#f0d4c0', opacity: 0.15 },
  { type: 'tetra', radius: 4.2, height: -0.5, size: 0.06, color: '#e8c8b8', opacity: 0.12 },
  { type: 'tetra', radius: 5.0, height: 0.8, size: 0.07, color: '#f8e0d0', opacity: 0.1 },

  // Octahedra - cool tones
  { type: 'octa', radius: 3.8, height: -0.2, size: 0.06, color: '#c8d8e0', opacity: 0.12 },
  { type: 'octa', radius: 4.5, height: 0.6, size: 0.05, color: '#d0e0e8', opacity: 0.1 },
  { type: 'octa', radius: 5.3, height: -0.4, size: 0.07, color: '#b8d0d8', opacity: 0.08 },

  // Icosahedra - neutral tones
  { type: 'icosa', radius: 4.0, height: 0.4, size: 0.04, color: '#e0d8d0', opacity: 0.1 },
  { type: 'icosa', radius: 4.8, height: -0.6, size: 0.05, color: '#d8d0c8', opacity: 0.08 },

  // Extra small shapes for depth
  { type: 'tetra', radius: 5.8, height: 0.2, size: 0.04, color: '#e8e0d8', opacity: 0.06 },
  { type: 'octa', radius: 3.2, height: 0.5, size: 0.04, color: '#d8e0e0', opacity: 0.08 },
];

interface ShapeState {
  angle: number;
  angularSpeed: number;
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
  phaseOffset: number;
}

export interface FloatingGeometryProps {
  /** Enable/disable @default true */
  enabled?: boolean;
  /** Overall opacity multiplier @default 1.0 */
  opacityMultiplier?: number;
  /** Orbital speed multiplier @default 1.0 */
  speedMultiplier?: number;
}

/**
 * FloatingGeometry - Renders small geometric shapes orbiting lazily
 */
export const FloatingGeometry = memo(function FloatingGeometryComponent({
  enabled = true,
  opacityMultiplier = 1.0,
  speedMultiplier = 1.0,
}: FloatingGeometryProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const world = useWorld();

  // Store per-shape animation state
  const shapeStates = useRef<ShapeState[]>([]);

  // Create geometries for each shape type
  const geometries = useMemo(() => {
    const tetraGeo = new THREE.TetrahedronGeometry(1, 0);
    const octaGeo = new THREE.OctahedronGeometry(1, 0);
    const icosaGeo = new THREE.IcosahedronGeometry(1, 0);
    return { tetra: tetraGeo, octa: octaGeo, icosa: icosaGeo };
  }, []);

  // Create materials for each shape
  const materials = useMemo(
    () =>
      SHAPE_CONFIGS.map(
        (config) =>
          new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: config.opacity * opacityMultiplier,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
      ),
    [opacityMultiplier],
  );

  // Cleanup
  useDisposeGeometries([geometries.tetra, geometries.octa, geometries.icosa]);
  useDisposeMaterials(materials);

  // Initialize shape states
  useEffect(() => {
    shapeStates.current = SHAPE_CONFIGS.map((_, i) => ({
      angle: (i / SHAPE_CONFIGS.length) * Math.PI * 2 + Math.random() * 0.5,
      angularSpeed: (0.1 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1),
      rotationAxis: new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize(),
      rotationSpeed: 0.2 + Math.random() * 0.3,
      phaseOffset: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    if (!enabled || !groupRef.current) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      const phase = breathEntity?.get(breathPhase)?.value ?? 0;
      const time = state.clock.elapsedTime;

      meshRefs.current.forEach((mesh, i) => {
        if (!mesh) return;
        const config = SHAPE_CONFIGS[i];
        const shapeState = shapeStates.current[i];
        if (!shapeState) return;

        // Update orbital angle
        shapeState.angle += shapeState.angularSpeed * 0.01 * speedMultiplier;

        // Calculate orbital position
        const radius = config.radius * (1 + phase * 0.05); // Slight breathing expansion
        _tempPosition.set(
          Math.cos(shapeState.angle) * radius,
          config.height + Math.sin(time * 0.3 + shapeState.phaseOffset) * 0.2,
          Math.sin(shapeState.angle) * radius,
        );

        // Self-rotation
        _tempEuler.set(
          time * shapeState.rotationSpeed * shapeState.rotationAxis.x,
          time * shapeState.rotationSpeed * shapeState.rotationAxis.y,
          time * shapeState.rotationSpeed * shapeState.rotationAxis.z,
        );
        _tempQuaternion.setFromEuler(_tempEuler);

        // Scale with breathing
        const scale = config.size * (0.8 + phase * 0.4);
        _tempScale.setScalar(scale);

        // Apply transform
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        mesh.matrix.copy(_tempMatrix);
        mesh.matrixAutoUpdate = false;

        // Update opacity with breathing
        materials[i].opacity = config.opacity * opacityMultiplier * (0.6 + phase * 0.4);
      });
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef} name="Floating Geometry">
      {SHAPE_CONFIGS.map((config, i) => {
        const geo =
          config.type === 'tetra'
            ? geometries.tetra
            : config.type === 'octa'
              ? geometries.octa
              : geometries.icosa;
        // Use unique key based on config properties (type + radius + height)
        const uniqueKey = `${config.type}-${config.radius}-${config.height}`;
        return (
          <mesh
            key={uniqueKey}
            ref={(el) => {
              meshRefs.current[i] = el;
            }}
            geometry={geo}
            material={materials[i]}
            scale={config.size}
          />
        );
      })}
    </group>
  );
});

export default FloatingGeometry;
