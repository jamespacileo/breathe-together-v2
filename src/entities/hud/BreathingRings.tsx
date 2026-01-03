/**
 * BreathingRings - Holographic concentric data rings around the globe
 *
 * Features:
 * - Inner Ring: Glowing arc that fills as user inhales (progress bar)
 * - Outer Ring: Faint pulsing circle showing target rhythm
 * - Phase Markers: 4 cardinal points indicating breathing phases
 * - Holographic aesthetic with neon glow and glassmorphism
 *
 * Positioned between globe (radius 1.5) and particle orbit (min 2.5)
 * Driven by breathPhase trait from ECS system.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';
import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType, rawProgress } from '../breath/traits';

/**
 * Ring positioning (between globe and particle orbit)
 * Globe radius: 1.5, Particle orbit min: 2.5
 */
const RING_CONFIG = {
  /** Inner progress ring radius */
  innerRadius: 1.85,
  /** Outer target ring radius */
  outerRadius: 2.15,
  /** Ring thickness (tube radius) */
  thickness: 0.008,
  /** Ring segments for smooth curves */
  segments: 128,
  /** Phase marker size */
  markerSize: 0.04,
};

/**
 * Holographic color palette
 */
const HOLO_COLORS = {
  /** Inhale phase - cool teal */
  inhale: new THREE.Color('#5cb3a8'),
  /** Hold phase - warm gold */
  hold: new THREE.Color('#c9a06c'),
  /** Exhale phase - soft blue */
  exhale: new THREE.Color('#7fa8d1'),
  /** Base glow - soft white */
  glow: new THREE.Color('#ffffff'),
  /** Ring base color */
  ring: new THREE.Color('#e8dcd0'),
};

/**
 * Progress ring shader - creates glowing arc that fills with breath
 */
const progressVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const progressFragmentShader = `
uniform float progress;
uniform float breathPhase;
uniform vec3 activeColor;
uniform vec3 baseColor;
uniform float glowIntensity;
uniform float time;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  // Convert position to angle (0-1 around the ring)
  float angle = atan(vPosition.z, vPosition.x);
  float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);

  // Progress fill - starts from top (0.75) and goes clockwise
  float adjustedAngle = mod(normalizedAngle + 0.25, 1.0);
  float fill = step(adjustedAngle, progress);

  // Glow at progress edge
  float edgeDist = abs(adjustedAngle - progress);
  float edgeGlow = smoothstep(0.08, 0.0, edgeDist) * glowIntensity;

  // Breathing pulse on filled section
  float pulse = 1.0 + sin(time * 2.0) * 0.1;

  // Mix colors based on fill state
  vec3 color = mix(baseColor * 0.3, activeColor * pulse, fill);

  // Add edge glow
  color += activeColor * edgeGlow * 2.0;

  // Soft fresnel-like edge
  float alpha = 0.6 + fill * 0.3 + edgeGlow * 0.4;

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Target ring shader - pulsing outer ring showing rhythm
 */
const targetVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const targetFragmentShader = `
uniform float breathPhase;
uniform float phaseType;
uniform vec3 phaseColor;
uniform float time;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  // Soft pulsing based on breath
  float pulse = 0.4 + breathPhase * 0.4;

  // Rotating dashes effect
  float angle = atan(vNormal.z, vNormal.x);
  float dashPattern = sin(angle * 32.0 + time * 0.5) * 0.5 + 0.5;
  dashPattern = smoothstep(0.3, 0.7, dashPattern);

  // Color intensity
  vec3 color = phaseColor * pulse;

  // Alpha with dash pattern
  float alpha = (0.2 + pulse * 0.3) * (0.5 + dashPattern * 0.5);

  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Phase marker shader - glowing dots at cardinal positions
 */
const markerVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const markerFragmentShader = `
uniform vec3 color;
uniform float intensity;
uniform float isActive;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Fresnel glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Active state boost
  float boost = 1.0 + isActive * 1.5;

  // Core glow
  float glow = 0.6 + fresnel * 0.4;

  vec3 finalColor = color * glow * boost * intensity;
  float alpha = (0.5 + fresnel * 0.5) * intensity * boost;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface BreathingRingsProps {
  /** Show inner progress ring @default true */
  showProgressRing?: boolean;
  /** Show outer target ring @default true */
  showTargetRing?: boolean;
  /** Show phase markers @default true */
  showMarkers?: boolean;
  /** Overall opacity @default 0.8 */
  opacity?: number;
  /** Glow intensity @default 1.0 */
  glowIntensity?: number;
}

/**
 * BreathingRings - Holographic concentric rings driven by breath state
 */
export function BreathingRings({
  showProgressRing = true,
  showTargetRing = true,
  showMarkers = true,
  opacity = 0.8,
  glowIntensity = 1.0,
}: BreathingRingsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Create ring geometries
  const progressGeometry = useMemo(() => {
    const geometry = new THREE.TorusGeometry(
      RING_CONFIG.innerRadius,
      RING_CONFIG.thickness,
      8,
      RING_CONFIG.segments,
    );
    // Rotate to horizontal plane
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);

  const targetGeometry = useMemo(() => {
    const geometry = new THREE.TorusGeometry(
      RING_CONFIG.outerRadius,
      RING_CONFIG.thickness * 0.6,
      6,
      RING_CONFIG.segments,
    );
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);

  const markerGeometry = useMemo(
    () => new THREE.SphereGeometry(RING_CONFIG.markerSize, 16, 16),
    [],
  );

  // Create materials
  const progressMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          progress: { value: 0 },
          breathPhase: { value: 0 },
          activeColor: { value: HOLO_COLORS.inhale },
          baseColor: { value: HOLO_COLORS.ring },
          glowIntensity: { value: glowIntensity },
          time: { value: 0 },
        },
        vertexShader: progressVertexShader,
        fragmentShader: progressFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [glowIntensity],
  );

  const targetMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          breathPhase: { value: 0 },
          phaseType: { value: 0 },
          phaseColor: { value: HOLO_COLORS.glow },
          time: { value: 0 },
        },
        vertexShader: targetVertexShader,
        fragmentShader: targetFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // Create 4 marker materials (one per phase)
  const markerMaterials = useMemo(
    () =>
      [0, 1, 2, 3].map(
        (i) =>
          new THREE.ShaderMaterial({
            uniforms: {
              color: {
                value:
                  i === 0
                    ? HOLO_COLORS.inhale
                    : i === 1
                      ? HOLO_COLORS.hold
                      : i === 2
                        ? HOLO_COLORS.exhale
                        : HOLO_COLORS.hold,
              },
              intensity: { value: 0.6 },
              isActive: { value: 0 },
            },
            vertexShader: markerVertexShader,
            fragmentShader: markerFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [],
  );

  // Cleanup resources
  useDisposeMaterials([progressMaterial, targetMaterial, ...markerMaterials]);
  useDisposeGeometries([progressGeometry, targetGeometry, markerGeometry]);

  // Calculate marker positions (at cardinal points on outer ring)
  const markerPositions = useMemo(() => {
    const r = RING_CONFIG.outerRadius;
    // Top (inhale start), Right (hold-in), Bottom (exhale), Left (hold-out)
    return [
      new THREE.Vector3(0, 0, r), // Top - Inhale
      new THREE.Vector3(r, 0, 0), // Right - Hold-in
      new THREE.Vector3(0, 0, -r), // Bottom - Exhale
      new THREE.Vector3(-r, 0, 0), // Left - Hold-out (if applicable)
    ];
  }, []);

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      const progress = breathEntity.get(rawProgress)?.value ?? 0;

      const time = state.clock.elapsedTime;

      // Calculate overall cycle progress for the progress ring
      // Maps the breathing phases to a 0-1 progress around the ring
      let cycleProgress = 0;
      const inhaleFraction = BREATH_PHASES.INHALE / BREATH_TOTAL_CYCLE;
      const holdInFraction = BREATH_PHASES.HOLD_IN / BREATH_TOTAL_CYCLE;
      const exhaleFraction = BREATH_PHASES.EXHALE / BREATH_TOTAL_CYCLE;

      switch (currentPhaseType) {
        case 0: // Inhale
          cycleProgress = progress * inhaleFraction;
          break;
        case 1: // Hold-in
          cycleProgress = inhaleFraction + progress * holdInFraction;
          break;
        case 2: // Exhale
          cycleProgress = inhaleFraction + holdInFraction + progress * exhaleFraction;
          break;
        case 3: // Hold-out (if any)
          cycleProgress = 1.0;
          break;
      }

      // Update progress ring
      progressMaterial.uniforms.progress.value = cycleProgress;
      progressMaterial.uniforms.breathPhase.value = phase;
      progressMaterial.uniforms.time.value = time;

      // Update active color based on phase
      const activeColor =
        currentPhaseType === 0
          ? HOLO_COLORS.inhale
          : currentPhaseType === 1
            ? HOLO_COLORS.hold
            : currentPhaseType === 2
              ? HOLO_COLORS.exhale
              : HOLO_COLORS.hold;
      progressMaterial.uniforms.activeColor.value = activeColor;

      // Update target ring
      targetMaterial.uniforms.breathPhase.value = phase;
      targetMaterial.uniforms.phaseType.value = currentPhaseType;
      targetMaterial.uniforms.phaseColor.value = activeColor;
      targetMaterial.uniforms.time.value = time;

      // Update marker intensities
      markerMaterials.forEach((mat, i) => {
        mat.uniforms.isActive.value = i === currentPhaseType ? 1 : 0;
        mat.uniforms.intensity.value = i === currentPhaseType ? 1.0 : 0.4;
      });

      // Subtle rotation
      groupRef.current.rotation.y = time * 0.02;
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  // Apply global opacity
  useEffect(() => {
    progressMaterial.opacity = opacity;
    targetMaterial.opacity = opacity;
    markerMaterials.forEach((m) => {
      m.opacity = opacity;
    });
  }, [opacity, progressMaterial, targetMaterial, markerMaterials]);

  return (
    <group ref={groupRef} name="Breathing Rings">
      {/* Inner Progress Ring */}
      {showProgressRing && <mesh geometry={progressGeometry} material={progressMaterial} />}

      {/* Outer Target Ring */}
      {showTargetRing && <mesh geometry={targetGeometry} material={targetMaterial} />}

      {/* Phase Markers - fixed positions: inhale, hold-in, exhale, hold-out */}
      {showMarkers &&
        (['inhale', 'hold-in', 'exhale', 'hold-out'] as const).map((phase, i) => (
          <mesh
            key={`marker-${phase}`}
            geometry={markerGeometry}
            material={markerMaterials[i]}
            position={markerPositions[i]}
          />
        ))}
    </group>
  );
}

export default BreathingRings;
