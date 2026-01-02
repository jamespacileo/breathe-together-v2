/**
 * BreathWaveform - Flowing ribbon that traces breath history
 *
 * Inspired by: Audio waveform displays / oscilloscope visualizers
 *
 * A continuous 3D ribbon orbits the globe, with its height/amplitude
 * representing the breath phase over time. Creates a visual "EKG" of breathing.
 *
 * The ribbon flows continuously, with peaks showing inhales and valleys
 * showing exhales. Color shifts through a warm gradient based on phase.
 *
 * Visual effect: A glowing serpentine trail that shows your breath journey.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType } from '../breath/traits';

/**
 * Phase colors for gradient (Monument Valley palette)
 */
const PHASE_GRADIENT: Record<number, THREE.Color> = {
  0: new THREE.Color('#ffbe0b'), // Inhale: Warm Gold
  1: new THREE.Color('#06d6a0'), // Hold-in: Teal
  2: new THREE.Color('#118ab2'), // Exhale: Deep Blue
  3: new THREE.Color('#ef476f'), // Hold-out: Rose
};

/**
 * Waveform configuration
 */
const WAVEFORM_CONFIG = {
  /** Number of segments in the ribbon */
  segments: 128,
  /** Ribbon width */
  ribbonWidth: 0.15,
  /** Base orbit radius */
  orbitRadius: 4.5,
  /** Amplitude of breath height offset */
  amplitudeHeight: 1.2,
  /** How fast the ribbon flows */
  flowSpeed: 0.3,
  /** Vertical offset from center */
  baseHeight: 0,
  /** Number of complete orbits visible */
  orbits: 1.5,
  /** Fade out at the tail */
  tailFadeStart: 0.7,
};

/**
 * Ribbon vertex shader with displacement
 */
const ribbonVertexShader = `
attribute float alpha;
attribute vec3 ribbonColor;

varying float vAlpha;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vAlpha = alpha;
  vColor = ribbonColor;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const ribbonFragmentShader = `
varying float vAlpha;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Fresnel edge glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Brighten the base color
  vec3 brightColor = vColor * 1.2 + vec3(0.1);

  // Add fresnel glow
  vec3 finalColor = mix(brightColor, vec3(1.0), fresnel * 0.4);

  // Apply alpha with minimum visibility
  float alpha = vAlpha * 0.9;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface BreathWaveformProps {
  /** Enable/disable the effect @default true */
  enabled?: boolean;
  /** Opacity multiplier @default 0.8 */
  opacity?: number;
  /** Scale multiplier @default 1.0 */
  scale?: number;
  /** Orbit radius @default 4.5 */
  radius?: number;
}

/**
 * BreathWaveform - A flowing ribbon showing breath history
 */
export function BreathWaveform({
  enabled = true,
  opacity = 0.8,
  scale = 1.0,
  radius = 4.5,
}: BreathWaveformProps) {
  const world = useWorld();
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Store breath history (circular buffer)
  const historyLength = WAVEFORM_CONFIG.segments;
  const breathHistory = useRef<{ phase: number; phaseType: number }[]>(
    Array.from({ length: historyLength }, () => ({ phase: 0, phaseType: 0 })),
  );
  const historyIndex = useRef(0);

  // Create ribbon geometry
  const geometry = useMemo(() => {
    const segments = WAVEFORM_CONFIG.segments;
    const geo = new THREE.BufferGeometry();

    // Each segment has 2 vertices (top and bottom of ribbon)
    const vertexCount = segments * 2;
    const indexCount = (segments - 1) * 6; // 2 triangles per quad

    // Attributes
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const alphas = new Float32Array(vertexCount);
    const colors = new Float32Array(vertexCount * 3);
    const indices = new Uint16Array(indexCount);

    // Initialize positions (will be updated in useFrame)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('ribbonColor', new THREE.BufferAttribute(colors, 3));

    // Create triangle indices
    let idx = 0;
    for (let i = 0; i < segments - 1; i++) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;

      // First triangle
      indices[idx++] = v0;
      indices[idx++] = v1;
      indices[idx++] = v2;

      // Second triangle
      indices[idx++] = v1;
      indices[idx++] = v3;
      indices[idx++] = v2;
    }
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    return geo;
  }, []);

  // Create material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: ribbonVertexShader,
        fragmentShader: ribbonFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [],
  );

  // Cleanup
  useDisposeGeometries([geometry]);
  useDisposeMaterials([material]);

  useFrame((_, delta) => {
    if (!enabled || !meshRef.current) return;

    timeRef.current += delta;

    try {
      // Get current breath state
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      const currentPhase = breathEntity.get(breathPhase)?.value ?? 0;
      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

      // Update history (record new sample periodically)
      const sampleRate = 0.05; // Sample every 50ms
      const samplesNeeded = Math.floor(delta / sampleRate);
      for (let s = 0; s < Math.max(1, samplesNeeded); s++) {
        breathHistory.current[historyIndex.current] = {
          phase: currentPhase,
          phaseType: currentPhaseType,
        };
        historyIndex.current = (historyIndex.current + 1) % historyLength;
      }

      // Update geometry
      const positions = geometry.attributes.position.array as Float32Array;
      const normals = geometry.attributes.normal.array as Float32Array;
      const alphas = geometry.attributes.alpha.array as Float32Array;
      const colors = geometry.attributes.ribbonColor.array as Float32Array;

      const segments = WAVEFORM_CONFIG.segments;
      const orbits = WAVEFORM_CONFIG.orbits;
      const baseRadius = radius * scale;
      const amplitude = WAVEFORM_CONFIG.amplitudeHeight * scale;
      const ribbonWidth = WAVEFORM_CONFIG.ribbonWidth * scale;
      const flowOffset = timeRef.current * WAVEFORM_CONFIG.flowSpeed;

      for (let i = 0; i < segments; i++) {
        // Progress along the ribbon (0 = head/newest, 1 = tail/oldest)
        const t = i / (segments - 1);

        // Read from history (newest first)
        const historyIdx = (historyIndex.current - 1 - i + historyLength * 2) % historyLength;
        const historyEntry = breathHistory.current[historyIdx];

        // Angle around the orbit (with flow animation)
        const angle = (t * orbits + flowOffset) * Math.PI * 2;

        // Height based on breath phase from history
        const height = WAVEFORM_CONFIG.baseHeight + (historyEntry.phase - 0.5) * amplitude;

        // Calculate ribbon center position
        const x = Math.cos(angle) * baseRadius;
        const z = Math.sin(angle) * baseRadius;
        const y = height;

        // Calculate ribbon direction (tangent)
        const nextAngle = ((t + 0.01) * orbits + flowOffset) * Math.PI * 2;
        const tangent = new THREE.Vector3(-Math.sin(nextAngle), 0, Math.cos(nextAngle)).normalize();

        // Up vector (perpendicular to tangent in the xz plane, pointing up)
        const up = new THREE.Vector3(0, 1, 0);

        // Ribbon width direction (perpendicular to tangent and up)
        const widthDir = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // Calculate top and bottom vertex positions
        const vIdx0 = i * 2; // Top vertex
        const vIdx1 = i * 2 + 1; // Bottom vertex

        positions[vIdx0 * 3] = x + widthDir.x * ribbonWidth * 0.5;
        positions[vIdx0 * 3 + 1] = y + ribbonWidth * 0.5;
        positions[vIdx0 * 3 + 2] = z + widthDir.z * ribbonWidth * 0.5;

        positions[vIdx1 * 3] = x - widthDir.x * ribbonWidth * 0.5;
        positions[vIdx1 * 3 + 1] = y - ribbonWidth * 0.5;
        positions[vIdx1 * 3 + 2] = z - widthDir.z * ribbonWidth * 0.5;

        // Normal (pointing outward from center)
        const normal = new THREE.Vector3(x, 0, z).normalize();
        normals[vIdx0 * 3] = normal.x;
        normals[vIdx0 * 3 + 1] = normal.y;
        normals[vIdx0 * 3 + 2] = normal.z;
        normals[vIdx1 * 3] = normal.x;
        normals[vIdx1 * 3 + 1] = normal.y;
        normals[vIdx1 * 3 + 2] = normal.z;

        // Alpha (fade out at tail)
        let alpha = opacity;
        if (t > WAVEFORM_CONFIG.tailFadeStart) {
          const fadeProgress =
            (t - WAVEFORM_CONFIG.tailFadeStart) / (1 - WAVEFORM_CONFIG.tailFadeStart);
          alpha *= 1 - fadeProgress * fadeProgress;
        }
        // Also fade at head for smooth appearance
        if (t < 0.1) {
          alpha *= t / 0.1;
        }
        alphas[vIdx0] = alpha;
        alphas[vIdx1] = alpha;

        // Color based on phase type from history
        const phaseColor = PHASE_GRADIENT[historyEntry.phaseType] || PHASE_GRADIENT[0];
        colors[vIdx0 * 3] = phaseColor.r;
        colors[vIdx0 * 3 + 1] = phaseColor.g;
        colors[vIdx0 * 3 + 2] = phaseColor.b;
        colors[vIdx1 * 3] = phaseColor.r;
        colors[vIdx1 * 3 + 1] = phaseColor.g;
        colors[vIdx1 * 3 + 2] = phaseColor.b;
      }

      // Mark attributes as needing update
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;
      geometry.attributes.ribbonColor.needsUpdate = true;
      geometry.computeVertexNormals();
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  if (!enabled) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      name="Breath Waveform"
      frustumCulled={false}
    />
  );
}

export default BreathWaveform;
