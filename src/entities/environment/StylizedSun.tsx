/**
 * StylizedSun - Monument Valley inspired celestial sun.
 *
 * Renders a stylized sun with warm gradients, soft rays, and subtle
 * breathing synchronization. Position tracks the real sun's location
 * based on UTC time.
 *
 * Features:
 * - Real astronomical positioning via RA/Dec calculations
 * - Multi-layered glow with warm gradient
 * - Animated corona/ray effects
 * - Breathing-synchronized pulsing
 * - Soft, dreamy aesthetic matching the meditation theme
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { calculateGMST, calculateSunPosition, celestialToCartesian } from '../../lib/astronomy';
import { breathPhase } from '../breath/traits';
import StylizedSunMaterialTSL from './StylizedSunTSL';

interface StylizedSunProps {
  /** Enable sun rendering @default true */
  enabled?: boolean;
  /** Distance from center @default 28 */
  radius?: number;
  /** Sun disc size @default 12 */
  size?: number;
  /** Core color - warm golden @default '#fffcf0' */
  coreColor?: string;
  /** Corona color - warm peach @default '#ffd9a8' */
  coronaColor?: string;
  /** Outer glow color - soft orange @default '#ffb080' */
  glowColor?: string;
  /** Enable breathing sync @default true */
  breathSync?: boolean;
  /** Ray count @default 16 */
  rayCount?: number;
  /** Overall intensity @default 0.7 */
  intensity?: number;
  /** Show debug gizmo @default false */
  showGizmo?: boolean;
}

/**
 * Sun rays component - INSTANCED for performance (1 draw call vs 16)
 * Uses InstancedMesh instead of individual meshes for each ray
 */
function SunRays({
  count,
  size,
  color,
  breathPhase,
}: {
  count: number;
  size: number;
  color: string;
  breathPhase: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Create geometry and material once
  const { geometry, material } = useMemo(() => {
    // Use average dimensions for the base geometry
    const avgLength = size * 1.5;
    const avgWidth = 0.12;
    const geo = new THREE.PlaneGeometry(avgLength, avgWidth);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { geometry: geo, material: mat };
  }, [size, color]);

  // Pre-calculate ray data (lengths vary by index)
  const rayData = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      // Alternating long/short rays - use scale factor
      const lengthScale = i % 2 === 0 ? 1.2 : 0.8;
      const widthScale = i % 2 === 0 ? 1.25 : 0.67;
      return { angle, lengthScale, widthScale };
    });
  }, [count]);

  // Update rotation and instance matrices each frame
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }

    if (!instancedRef.current) return;

    // Update instance transforms with breath pulse
    const pulseFactor = 1 + breathPhase * 0.1;

    for (let i = 0; i < count; i++) {
      const ray = rayData[i];
      const angle = ray.angle;

      // Position at edge of sun disc
      dummy.position.set(Math.cos(angle) * size * 0.6, Math.sin(angle) * size * 0.6, -0.1);
      dummy.rotation.set(0, 0, angle);
      // Scale includes length variation + breath pulse
      dummy.scale.set(ray.lengthScale * pulseFactor, ray.widthScale, 1);
      dummy.updateMatrix();

      instancedRef.current.setMatrixAt(i, dummy.matrix);
    }

    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[geometry, material, count]} frustumCulled={false} />
    </group>
  );
}

/**
 * StylizedSun - Monument Valley inspired celestial sun (TSL)
 */
export const StylizedSun = memo(function StylizedSun(props: StylizedSunProps) {
  const {
    enabled = true,
    radius = 28,
    size = 12,
    coreColor = '#fffcf0',
    coronaColor = '#ffd9a8',
    glowColor = '#ffb080',
    breathSync = true,
    rayCount = 16,
    intensity = 0.7,
    showGizmo = false,
  } = props;

  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [breathPhaseValue, setBreathPhaseValue] = useState(0.5);
  const lastSunUpdateRef = useRef(-Infinity);

  const geometry = useMemo(() => new THREE.CircleGeometry(size, 64), [size]);

  // Keep the sun position in sync with current UTC time.
  // This uses astronomy-engine, so we only recompute occasionally.
  const updateSunPosition = useMemo(() => {
    const position = new THREE.Vector3();
    return (nowSeconds: number) => {
      if (nowSeconds - lastSunUpdateRef.current < 60) return position;
      lastSunUpdateRef.current = nowSeconds;

      const date = new Date();
      const gmst = calculateGMST(date);
      const sunPos = calculateSunPosition(date);
      const [x, y, z] = celestialToCartesian(sunPos.ra, sunPos.dec, radius, gmst);
      position.set(x, y, z);
      return position;
    };
  }, [radius]);

  useFrame((state) => {
    if (!enabled) return;

    const nowSeconds = state.clock.elapsedTime;
    const pos = updateSunPosition(nowSeconds);
    if (groupRef.current) {
      groupRef.current.position.copy(pos);
    }

    // Billboard the sun disc for consistent appearance.
    if (meshRef.current) {
      meshRef.current.lookAt(state.camera.position);
    }

    if (!breathSync) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      const next = breathEntity?.get(breathPhase)?.value ?? 0.5;
      setBreathPhaseValue((prev) => (Math.abs(prev - next) > 0.002 ? next : prev));
    } catch (_e) {
      // ECS world can become stale during hot-reload; ignore transient errors.
    }
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
        <StylizedSunMaterialTSL
          coreColor={coreColor}
          coronaColor={coronaColor}
          glowColor={glowColor}
          intensity={intensity}
          breathPhase={breathPhaseValue}
        />
      </mesh>

      <SunRays count={rayCount} size={size} color={glowColor} breathPhase={breathPhaseValue} />

      {showGizmo && (
        <mesh>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
});

export default StylizedSun;
