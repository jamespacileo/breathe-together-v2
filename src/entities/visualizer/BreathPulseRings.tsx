/**
 * BreathPulseRings - Concentric rings that pulse outward on phase transitions
 *
 * Inspired by: Circular frequency spectrum visualizers / audio beat detection
 *
 * Each ring spawns when the breath phase transitions (inhale→hold→exhale→repeat).
 * Rings expand outward with physics-based decay, fading as they grow.
 * Color matches the phase that triggered it (Monument Valley palette).
 *
 * Visual effect: Soft glowing halos ripple outward at each breath milestone.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType } from '../breath/traits';

/**
 * Ring configuration per phase type
 * Colors from Monument Valley palette
 */
const PHASE_COLORS: Record<number, string> = {
  0: '#ffbe0b', // Inhale: Warm Gold (Gratitude)
  1: '#06d6a0', // Hold-in: Teal/Mint (Presence)
  2: '#118ab2', // Exhale: Deep Blue (Release)
  3: '#ef476f', // Hold-out: Warm Rose (Connection)
};

/**
 * Ring state for animation
 */
interface RingState {
  id: number;
  startTime: number;
  phaseType: number;
  scale: number;
  opacity: number;
  active: boolean;
}

/**
 * Ring shader - smooth gradient ring with glow
 */
const ringVertexShader = `
varying vec2 vUv;
varying float vDistance;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDistance = length(mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const ringFragmentShader = `
uniform vec3 ringColor;
uniform float opacity;
uniform float innerRadius;
uniform float outerRadius;
uniform float glowIntensity;

varying vec2 vUv;

void main() {
  // Calculate distance from center in UV space
  vec2 centeredUv = vUv - 0.5;
  float dist = length(centeredUv) * 2.0;

  // Ring shape with soft edges
  float ringWidth = outerRadius - innerRadius;
  float ringCenter = (innerRadius + outerRadius) / 2.0;
  float ringDist = abs(dist - ringCenter);

  // Soft falloff for glow effect
  float ring = 1.0 - smoothstep(0.0, ringWidth * 0.5, ringDist);

  // Add outer glow
  float glow = exp(-ringDist * glowIntensity) * 0.5;

  // Combine ring and glow
  float alpha = (ring + glow) * opacity;

  // Fade at edges for smooth blend
  alpha *= smoothstep(1.0, 0.8, dist);

  gl_FragColor = vec4(ringColor, alpha);
}
`;

/**
 * Maximum concurrent rings
 */
const MAX_RINGS = 6;

/**
 * Stable keys for ring meshes (prevents React key warnings)
 */
const RING_KEYS = Array.from({ length: MAX_RINGS }, (_, i) => `ring-slot-${i}`);

/**
 * Ring animation parameters
 */
const RING_CONFIG = {
  /** Duration in seconds for ring to fully expand and fade */
  lifetime: 2.5,
  /** Starting scale multiplier */
  startScale: 2.0,
  /** Ending scale multiplier */
  endScale: 8.0,
  /** Starting opacity */
  startOpacity: 0.6,
  /** Glow intensity (higher = tighter glow) */
  glowIntensity: 3.0,
  /** Ring thickness (inner to outer radius ratio) */
  innerRadiusRatio: 0.85,
};

/**
 * Update a single ring's animation state
 * Returns true if ring is still active, false if it should be hidden
 */
function updateRingAnimation(
  ring: RingState,
  mesh: THREE.Mesh,
  material: THREE.ShaderMaterial,
  time: number,
  scale: number,
  opacityMultiplier: number,
): boolean {
  if (!ring.active) {
    mesh.visible = false;
    return false;
  }

  const elapsed = time - ring.startTime;
  const progress = elapsed / RING_CONFIG.lifetime;

  if (progress >= 1) {
    ring.active = false;
    mesh.visible = false;
    return false;
  }

  // Eased progress (ease-out cubic for natural deceleration)
  const easedProgress = 1 - (1 - progress) ** 3;

  // Update scale (expand outward)
  const currentScale =
    RING_CONFIG.startScale + (RING_CONFIG.endScale - RING_CONFIG.startScale) * easedProgress;
  mesh.scale.set(currentScale * scale, currentScale * scale, 1);

  // Update opacity (fade out)
  const currentOpacity = RING_CONFIG.startOpacity * (1 - progress) * opacityMultiplier;
  ring.opacity = currentOpacity;

  // Update material uniforms
  material.uniforms.ringColor.value.set(PHASE_COLORS[ring.phaseType]);
  material.uniforms.opacity.value = currentOpacity;

  mesh.visible = true;
  return true;
}

interface BreathPulseRingsProps {
  /** Enable/disable the effect @default true */
  enabled?: boolean;
  /** Base size multiplier @default 1.0 */
  scale?: number;
  /** Opacity multiplier @default 1.0 */
  opacityMultiplier?: number;
}

/**
 * BreathPulseRings - Spawns expanding rings on breath phase transitions
 */
export function BreathPulseRings({
  enabled = true,
  scale = 1.0,
  opacityMultiplier = 1.0,
}: BreathPulseRingsProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const prevPhaseRef = useRef<number>(-1);
  const ringIdRef = useRef(0);

  // Ring states for animation
  const ringStates = useRef<RingState[]>(
    Array.from({ length: MAX_RINGS }, (_, i) => ({
      id: i,
      startTime: 0,
      phaseType: 0,
      scale: 0,
      opacity: 0,
      active: false,
    })),
  );

  // Create shared geometry (plane for shader-based ring)
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  // Create materials for each ring slot
  const materials = useMemo(
    () =>
      Array.from(
        { length: MAX_RINGS },
        () =>
          new THREE.ShaderMaterial({
            uniforms: {
              ringColor: { value: new THREE.Color(PHASE_COLORS[0]) },
              opacity: { value: 0 },
              innerRadius: { value: RING_CONFIG.innerRadiusRatio },
              outerRadius: { value: 1.0 },
              glowIntensity: { value: RING_CONFIG.glowIntensity },
            },
            vertexShader: ringVertexShader,
            fragmentShader: ringFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );

  // Cleanup GPU resources
  useDisposeGeometries([geometry]);
  useDisposeMaterials(materials);

  // Find next available ring slot
  const getNextRingSlot = (): number => {
    // First, try to find an inactive slot
    for (let i = 0; i < MAX_RINGS; i++) {
      if (!ringStates.current[i].active) {
        return i;
      }
    }
    // If all active, find the oldest (lowest opacity)
    let oldestIdx = 0;
    let lowestOpacity = 1;
    for (let i = 0; i < MAX_RINGS; i++) {
      if (ringStates.current[i].opacity < lowestOpacity) {
        lowestOpacity = ringStates.current[i].opacity;
        oldestIdx = i;
      }
    }
    return oldestIdx;
  };

  // Spawn a new ring
  const spawnRing = (currentPhaseType: number, time: number) => {
    const slot = getNextRingSlot();
    ringStates.current[slot] = {
      id: ringIdRef.current++,
      startTime: time,
      phaseType: currentPhaseType,
      scale: RING_CONFIG.startScale,
      opacity: RING_CONFIG.startOpacity,
      active: true,
    };
  };

  useFrame((state) => {
    if (!enabled || !groupRef.current) return;

    const time = state.clock.elapsedTime;

    try {
      // Get current breath state
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

      // Detect phase transition (spawn new ring)
      if (prevPhaseRef.current !== -1 && currentPhaseType !== prevPhaseRef.current) {
        spawnRing(currentPhaseType, time);
      }
      prevPhaseRef.current = currentPhaseType;

      // Update all rings
      for (let i = 0; i < MAX_RINGS; i++) {
        const ring = ringStates.current[i];
        const mesh = meshRefs.current[i];
        const material = materials[i];

        if (!mesh) continue;

        updateRingAnimation(ring, mesh, material, time, scale, opacityMultiplier);
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  // Initialize mesh refs array
  useEffect(() => {
    meshRefs.current = new Array(MAX_RINGS).fill(null);
  }, []);

  if (!enabled) return null;

  return (
    <group ref={groupRef} name="Breath Pulse Rings">
      {materials.map((material, i) => (
        <mesh
          key={RING_KEYS[i]}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          geometry={geometry}
          material={material}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          visible={false}
        />
      ))}
    </group>
  );
}

export default BreathPulseRings;
