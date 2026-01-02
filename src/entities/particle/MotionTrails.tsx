/**
 * MotionTrails - Elegant comet-tail trails for ParticleSwarm shards
 *
 * Renders motion trails as fading points behind each moving particle.
 * Uses a single THREE.Points draw call for performance.
 *
 * Features:
 * - Position history buffer (circular) per particle
 * - Opacity fades from head to tail
 * - Size attenuates toward tail
 * - Sampling interval prevents over-dense trails
 * - Single draw call for all trails (GPU efficient)
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface MotionTrailsProps {
  /**
   * Reference to the THREE.Group containing particle meshes
   * Trails will track all visible meshes in this group
   */
  particleGroupRef: React.RefObject<THREE.Group | null>;

  /**
   * Number of trail points per particle
   * Higher = longer trails, more memory
   * @default 12
   */
  trailLength?: number;

  /**
   * Maximum particles to track (performance cap)
   * @default 200
   */
  maxParticles?: number;

  /**
   * Minimum distance before recording new trail point
   * Prevents over-dense trails when particles move slowly
   * @default 0.05
   */
  minDistance?: number;

  /**
   * Base size of trail points
   * @default 0.04
   */
  pointSize?: number;

  /**
   * Trail color (Monument Valley teal by default)
   * @default '#7ec8d4'
   */
  color?: string;

  /**
   * Base opacity at trail head
   * @default 0.6
   */
  opacity?: number;

  /**
   * Whether trails are enabled
   * @default true
   */
  enabled?: boolean;
}

// Shader for fading trail points with size attenuation
const trailVertexShader = /* glsl */ `
  attribute float trailOpacity;
  attribute float trailIndex;

  varying float vOpacity;

  uniform float pointSize;
  uniform float trailLength;

  void main() {
    vOpacity = trailOpacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Size attenuation: smaller toward tail, smaller with distance
    float tailFactor = 1.0 - (trailIndex / trailLength) * 0.6;
    float distanceFactor = 300.0 / (-mvPosition.z);

    gl_PointSize = pointSize * tailFactor * distanceFactor;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const trailFragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float baseOpacity;

  varying float vOpacity;

  void main() {
    // Soft circular point
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    // Soft edge falloff
    float alpha = smoothstep(0.5, 0.2, dist) * vOpacity * baseOpacity;

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Trail history entry for a single particle
 */
interface ParticleTrailHistory {
  /** Circular buffer of positions */
  positions: THREE.Vector3[];
  /** Current write index in circular buffer */
  writeIndex: number;
  /** Number of valid positions (grows until full) */
  validCount: number;
  /** Last recorded position (for distance check) */
  lastRecordedPos: THREE.Vector3;
}

export function MotionTrails({
  particleGroupRef,
  trailLength = 12,
  maxParticles = 200,
  minDistance = 0.05,
  pointSize = 0.04,
  color = '#7ec8d4',
  opacity = 0.6,
  enabled = true,
}: MotionTrailsProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Per-particle trail history
  const historyRef = useRef<Map<THREE.Object3D, ParticleTrailHistory>>(new Map());

  // Total possible points: maxParticles * trailLength
  const totalPoints = maxParticles * trailLength;

  // Create geometry with pre-allocated buffers
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Position buffer (xyz per point)
    const positions = new Float32Array(totalPoints * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Opacity buffer (one per point, fades toward tail)
    const opacities = new Float32Array(totalPoints);
    geo.setAttribute('trailOpacity', new THREE.BufferAttribute(opacities, 1));

    // Trail index buffer (0 = head, trailLength-1 = tail)
    const indices = new Float32Array(totalPoints);
    geo.setAttribute('trailIndex', new THREE.BufferAttribute(indices, 1));

    // Start with nothing visible
    geo.setDrawRange(0, 0);

    return geo;
  }, [totalPoints]);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        baseOpacity: { value: opacity },
        pointSize: { value: pointSize * 100 }, // Scale for shader
        trailLength: { value: trailLength },
      },
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [color, opacity, pointSize, trailLength]);

  // Update material uniforms when props change
  useEffect(() => {
    material.uniforms.color.value.set(color);
    material.uniforms.baseOpacity.value = opacity;
    material.uniforms.pointSize.value = pointSize * 100;
    material.uniforms.trailLength.value = trailLength;
  }, [material, color, opacity, pointSize, trailLength]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop - update trail positions
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Trail physics requires iterating particles, history buffer management, and buffer updates in a single frame callback
  useFrame(() => {
    if (!enabled) {
      geometry.setDrawRange(0, 0);
      return;
    }

    const group = particleGroupRef.current;
    if (!group) return;

    const history = historyRef.current;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const opacityAttr = geometry.attributes.trailOpacity as THREE.BufferAttribute;
    const indexAttr = geometry.attributes.trailIndex as THREE.BufferAttribute;

    const positions = posAttr.array as Float32Array;
    const opacities = opacityAttr.array as Float32Array;
    const trailIndices = indexAttr.array as Float32Array;

    // Track which particles are still in the group
    const currentParticles = new Set<THREE.Object3D>();

    let pointCount = 0;
    let particleIndex = 0;

    // Iterate through visible meshes in the group
    for (const child of group.children) {
      if (particleIndex >= maxParticles) break;

      // Skip invisible particles (scale near zero)
      if (child.scale.x < 0.01) continue;

      currentParticles.add(child);

      // Get or create history for this particle
      let particleHistory = history.get(child);
      if (!particleHistory) {
        particleHistory = {
          positions: Array.from({ length: trailLength }, () => new THREE.Vector3()),
          writeIndex: 0,
          validCount: 0,
          lastRecordedPos: new THREE.Vector3().copy(child.position),
        };
        history.set(child, particleHistory);
      }

      // Check if particle moved enough to record new position
      const distMoved = particleHistory.lastRecordedPos.distanceTo(child.position);
      if (distMoved >= minDistance) {
        // Record current position in circular buffer
        particleHistory.positions[particleHistory.writeIndex].copy(child.position);
        particleHistory.writeIndex = (particleHistory.writeIndex + 1) % trailLength;
        particleHistory.validCount = Math.min(particleHistory.validCount + 1, trailLength);
        particleHistory.lastRecordedPos.copy(child.position);
      }

      // Write trail points to buffers (newest to oldest)
      const { positions: historyPositions, writeIndex, validCount } = particleHistory;

      for (let i = 0; i < validCount; i++) {
        // Read from circular buffer in reverse order (newest first)
        const bufferIndex = (writeIndex - 1 - i + trailLength) % trailLength;
        const pos = historyPositions[bufferIndex];

        const offset = pointCount * 3;
        positions[offset] = pos.x;
        positions[offset + 1] = pos.y;
        positions[offset + 2] = pos.z;

        // Opacity fades linearly toward tail
        opacities[pointCount] = 1.0 - i / trailLength;

        // Trail index for size attenuation in shader
        trailIndices[pointCount] = i;

        pointCount++;
      }

      particleIndex++;
    }

    // Cleanup history for removed particles
    history.forEach((_, particle) => {
      if (!currentParticles.has(particle)) {
        history.delete(particle);
      }
    });

    // Update draw range and mark buffers dirty
    geometry.setDrawRange(0, pointCount);
    posAttr.needsUpdate = true;
    opacityAttr.needsUpdate = true;
    indexAttr.needsUpdate = true;
  });

  if (!enabled) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}

export default MotionTrails;
