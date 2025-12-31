/**
 * ConnectionLines - Ethereal constellation threads between particles
 *
 * Creates subtle, breathing-synchronized connection lines between nearby particles,
 * visualizing the invisible bonds between people breathing together.
 *
 * Design Philosophy:
 * - Lines appear during inhale (drawing connection inward)
 * - Fade during exhale (releasing attachment)
 * - Only connect nearby particles (proximity = intimacy)
 * - Warm, soft colors that complement the Monument Valley palette
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface ConnectionLinesProps {
  /** Reference to particle group to read positions from */
  particleGroupRef: React.RefObject<THREE.Group | null>;
  /** Maximum distance for connections @default 2.5 */
  maxDistance?: number;
  /** Maximum connections per particle @default 3 */
  maxConnectionsPerParticle?: number;
  /** Base line opacity @default 0.12 */
  baseOpacity?: number;
  /** Additional opacity during inhale @default 0.25 */
  breathOpacity?: number;
  /** Line color @default '#f5e6d3' (warm cream) */
  color?: string;
  /** Enable glow effect @default true */
  enableGlow?: boolean;
}

/**
 * Shader for soft, glowing lines with breathing opacity
 */
const connectionVertexShader = /* glsl */ `
  attribute float lineOpacity;
  varying float vOpacity;

  void main() {
    vOpacity = lineOpacity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const connectionFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBreathPhase;
  uniform float uBaseOpacity;
  uniform float uBreathOpacity;

  varying float vOpacity;

  void main() {
    // Breathing modulates overall opacity
    // Inhale (breathPhase → 1) = more visible
    // Exhale (breathPhase → 0) = fading
    float breathMultiplier = uBaseOpacity + uBreathPhase * uBreathOpacity;

    // Combine with per-line distance-based opacity
    float finalOpacity = vOpacity * breathMultiplier;

    // Subtle glow: brighten color slightly during inhale
    vec3 glowColor = mix(uColor, vec3(1.0), uBreathPhase * 0.15);

    gl_FragColor = vec4(glowColor, finalOpacity);
  }
`;

/**
 * Calculate connections between particles based on proximity
 * Uses k-nearest neighbors with distance threshold
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Graph connectivity algorithm requires nested loops for distance checks and connection counting - extracting would reduce readability
function calculateConnections(
  positions: THREE.Vector3[],
  maxDistance: number,
  maxPerParticle: number,
): { pairs: [number, number][]; distances: number[] } {
  const pairs: [number, number][] = [];
  const distances: number[] = [];
  const connectionCount = new Map<number, number>();

  // Initialize connection counts
  for (let i = 0; i < positions.length; i++) {
    connectionCount.set(i, 0);
  }

  // Find connections (avoid duplicates with i < j)
  for (let i = 0; i < positions.length; i++) {
    const countI = connectionCount.get(i) ?? 0;
    if (countI >= maxPerParticle) continue;

    // Collect candidates with distances
    const candidates: { j: number; dist: number }[] = [];

    for (let j = i + 1; j < positions.length; j++) {
      const countJ = connectionCount.get(j) ?? 0;
      if (countJ >= maxPerParticle) continue;

      const dist = positions[i].distanceTo(positions[j]);
      if (dist < maxDistance) {
        candidates.push({ j, dist });
      }
    }

    // Sort by distance and take closest (respecting limits)
    candidates.sort((a, b) => a.dist - b.dist);

    for (const candidate of candidates) {
      const currentCountI = connectionCount.get(i) ?? 0;
      const currentCountJ = connectionCount.get(candidate.j) ?? 0;

      if (currentCountI < maxPerParticle && currentCountJ < maxPerParticle) {
        pairs.push([i, candidate.j]);
        distances.push(candidate.dist);
        connectionCount.set(i, currentCountI + 1);
        connectionCount.set(candidate.j, currentCountJ + 1);
      }
    }
  }

  return { pairs, distances };
}

export function ConnectionLines({
  particleGroupRef,
  maxDistance = 2.5,
  maxConnectionsPerParticle = 3,
  baseOpacity = 0.12,
  breathOpacity = 0.25,
  color = '#f5e6d3',
  enableGlow = true,
}: ConnectionLinesProps) {
  const world = useWorld();
  const lineRef = useRef<THREE.LineSegments>(null);

  // Create geometry with max possible connections
  // (48 particles × 3 connections / 2 for symmetry = ~72 lines max)
  const maxLines = 100;

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();

    // Position buffer: 2 vertices per line, 3 floats per vertex
    const positions = new Float32Array(maxLines * 2 * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Per-vertex opacity for distance fade
    const opacities = new Float32Array(maxLines * 2);
    geom.setAttribute('lineOpacity', new THREE.BufferAttribute(opacities, 1));

    // Start with no lines visible
    geom.setDrawRange(0, 0);

    return geom;
  }, []);

  // Create shader material
  const material = useMemo(() => {
    const colorVec = new THREE.Color(color);

    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: colorVec },
        uBreathPhase: { value: 0 },
        uBaseOpacity: { value: baseOpacity },
        uBreathOpacity: { value: breathOpacity },
      },
      vertexShader: connectionVertexShader,
      fragmentShader: connectionFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: enableGlow ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
  }, [color, baseOpacity, breathOpacity, enableGlow]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop - update connections and shader
  useFrame(() => {
    const group = particleGroupRef.current;
    const line = lineRef.current;
    if (!group || !line) return;

    // Get breathing state from ECS
    let currentBreathPhase = 0;
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount
    }

    // Update shader uniform
    material.uniforms.uBreathPhase.value = currentBreathPhase;

    // Extract current particle positions
    const particlePositions: THREE.Vector3[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.useRefraction) {
        particlePositions.push(child.position.clone());
      }
    });

    if (particlePositions.length < 2) {
      geometry.setDrawRange(0, 0);
      return;
    }

    // Calculate connections
    const { pairs, distances } = calculateConnections(
      particlePositions,
      maxDistance,
      maxConnectionsPerParticle,
    );

    // Update geometry buffers
    const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
    const opacityAttr = geometry.attributes.lineOpacity as THREE.BufferAttribute;

    for (let i = 0; i < pairs.length && i < maxLines; i++) {
      const [a, b] = pairs[i];
      const dist = distances[i];

      // Distance-based opacity (closer = more opaque)
      const distFactor = 1 - dist / maxDistance;
      const opacity = distFactor * distFactor; // Quadratic falloff for softer fade

      // Vertex 1
      positionAttr.setXYZ(
        i * 2,
        particlePositions[a].x,
        particlePositions[a].y,
        particlePositions[a].z,
      );
      opacityAttr.setX(i * 2, opacity);

      // Vertex 2
      positionAttr.setXYZ(
        i * 2 + 1,
        particlePositions[b].x,
        particlePositions[b].y,
        particlePositions[b].z,
      );
      opacityAttr.setX(i * 2 + 1, opacity);
    }

    positionAttr.needsUpdate = true;
    opacityAttr.needsUpdate = true;
    geometry.setDrawRange(0, Math.min(pairs.length, maxLines) * 2);
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry} material={material} frustumCulled={false} />
  );
}

export default ConnectionLines;
