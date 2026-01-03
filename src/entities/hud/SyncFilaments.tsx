/**
 * SyncFilaments - Connecting filaments between synchronized particles
 *
 * Creates a "mycorrhizal network" visualization inspired by:
 * - Marshmallow Laser Feast's "Breathing with the Forest"
 * - Visualizes the invisible networks connecting users in sync
 *
 * Features:
 * - Glowing lines connect particles that are breathing together
 * - Line opacity/thickness increases with sync level
 * - Network density grows as group becomes more unified
 * - Organic, flowing movement with breath
 *
 * Performance: Uses THREE.Line with BufferGeometry for efficient rendering
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { VISUALS } from '../../constants';
import { useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

/**
 * Filament configuration
 */
const FILAMENT_CONFIG = {
  /** Maximum number of connections to render */
  maxConnections: 50,
  /** Maximum distance for connection (relative to orbit radius) */
  maxDistanceFactor: 0.4,
  /** Base line opacity */
  baseOpacity: 0.15,
  /** Opacity boost when particles are close */
  proximityBoost: 0.35,
  /** Line color - soft ethereal teal */
  color: new THREE.Color('#8fd4c8'),
  /** Secondary glow color */
  glowColor: new THREE.Color('#c9d4a8'),
};

/**
 * Filament line shader - ethereal glowing connections
 */
const filamentVertexShader = `
attribute float lineProgress;
varying float vProgress;
varying vec3 vPosition;

void main() {
  vProgress = lineProgress;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const filamentFragmentShader = `
uniform vec3 color;
uniform vec3 glowColor;
uniform float breathPhase;
uniform float time;
uniform float globalOpacity;

varying float vProgress;
varying vec3 vPosition;

void main() {
  // Fade at endpoints for organic feel
  float endFade = smoothstep(0.0, 0.15, vProgress) * smoothstep(1.0, 0.85, vProgress);

  // Breathing pulse
  float pulse = 0.7 + sin(time * 1.5 + vProgress * 3.14159) * 0.3;

  // Color gradient along line
  vec3 lineColor = mix(color, glowColor, vProgress * 0.5);

  // Breathing influence on color
  lineColor = mix(lineColor, glowColor, breathPhase * 0.3);

  // Final alpha with breathing modulation
  float alpha = endFade * pulse * globalOpacity;

  // Soft glow effect
  alpha *= (0.6 + breathPhase * 0.4);

  gl_FragColor = vec4(lineColor * pulse, alpha);
}
`;

interface SyncFilamentsProps {
  /** Particle positions to connect */
  particlePositions?: THREE.Vector3[];
  /** Overall visibility @default true */
  visible?: boolean;
  /** Opacity multiplier @default 1.0 */
  opacity?: number;
  /** Sync threshold (0-1) - minimum sync level to show connections @default 0.3 */
  syncThreshold?: number;
}

/**
 * Generate fibonacci sphere points for demo when no particle positions provided
 */
function generateFibonacciPoints(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    points.push(
      new THREE.Vector3(
        Math.cos(theta) * radiusAtY * radius,
        y * radius,
        Math.sin(theta) * radiusAtY * radius,
      ),
    );
  }

  return points;
}

/**
 * Find nearby particle pairs for connection
 */
function findNearbyPairs(
  positions: THREE.Vector3[],
  maxDistance: number,
  maxConnections: number,
): Array<[number, number, number]> {
  const pairs: Array<[number, number, number]> = []; // [index1, index2, distance]

  for (let i = 0; i < positions.length && pairs.length < maxConnections * 2; i++) {
    for (let j = i + 1; j < positions.length && pairs.length < maxConnections * 2; j++) {
      const dist = positions[i].distanceTo(positions[j]);
      if (dist < maxDistance) {
        pairs.push([i, j, dist]);
      }
    }
  }

  // Sort by distance and take closest
  pairs.sort((a, b) => a[2] - b[2]);
  return pairs.slice(0, maxConnections);
}

/**
 * SyncFilaments - Renders glowing connections between synchronized particles
 */
export function SyncFilaments({
  particlePositions,
  visible = true,
  opacity = 1.0,
  syncThreshold = 0.3,
}: SyncFilamentsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);
  const world = useWorld();

  // Use provided positions or generate demo points
  const positions = useMemo(() => {
    if (particlePositions && particlePositions.length > 0) {
      return particlePositions;
    }
    // Demo: Generate points on sphere at average orbit radius
    const avgRadius = (VISUALS.PARTICLE_ORBIT_MIN + VISUALS.PARTICLE_ORBIT_MAX) / 2;
    return generateFibonacciPoints(24, avgRadius);
  }, [particlePositions]);

  // Create line material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: FILAMENT_CONFIG.color },
          glowColor: { value: FILAMENT_CONFIG.glowColor },
          breathPhase: { value: 0 },
          time: { value: 0 },
          globalOpacity: { value: opacity * FILAMENT_CONFIG.baseOpacity },
        },
        vertexShader: filamentVertexShader,
        fragmentShader: filamentFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [opacity],
  );

  useDisposeMaterials([material]);

  // Create and update line geometry based on positions
  useEffect(() => {
    if (!groupRef.current) return;

    // Clear existing lines
    if (linesRef.current) {
      groupRef.current.remove(linesRef.current);
      linesRef.current.geometry.dispose();
    }

    // Find nearby pairs
    const maxDist =
      ((VISUALS.PARTICLE_ORBIT_MAX - VISUALS.PARTICLE_ORBIT_MIN) / 2) *
      FILAMENT_CONFIG.maxDistanceFactor;
    const pairs = findNearbyPairs(positions, maxDist * 2, FILAMENT_CONFIG.maxConnections);

    if (pairs.length === 0) return;

    // Create geometry with line progress attribute
    const linePositions: number[] = [];
    const lineProgressAttr: number[] = [];

    for (const [i, j] of pairs) {
      const p1 = positions[i];
      const p2 = positions[j];

      // Add line segment (two vertices per line)
      linePositions.push(p1.x, p1.y, p1.z);
      linePositions.push(p2.x, p2.y, p2.z);

      // Progress attribute for shader
      lineProgressAttr.push(0, 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    geometry.setAttribute('lineProgress', new THREE.Float32BufferAttribute(lineProgressAttr, 1));

    const lines = new THREE.LineSegments(geometry, material);
    linesRef.current = lines;
    groupRef.current.add(lines);

    return () => {
      if (linesRef.current) {
        linesRef.current.geometry.dispose();
      }
    };
  }, [positions, material]);

  // Animation loop
  useFrame((state) => {
    if (!visible) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;

        // Update shader uniforms
        material.uniforms.breathPhase.value = phase;
        material.uniforms.time.value = state.clock.elapsedTime;

        // Opacity responds to breathing - more visible during inhale
        const breathBoost = phase * FILAMENT_CONFIG.proximityBoost;
        material.uniforms.globalOpacity.value =
          opacity * (FILAMENT_CONFIG.baseOpacity + breathBoost);

        // Hide if below sync threshold
        if (linesRef.current) {
          linesRef.current.visible = phase >= syncThreshold || syncThreshold === 0;
        }
      }
    } catch {
      // Ignore ECS errors
    }
  });

  if (!visible) return null;

  return <group ref={groupRef} name="Sync Filaments" />;
}

export default SyncFilaments;
