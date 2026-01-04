/**
 * PhaseMarkers - 4·7·8 orbital markers showing breathing rhythm
 *
 * Three small holographic octahedra positioned around the globe,
 * each representing a phase duration (4s inhale, 7s hold, 8s exhale).
 * Sizes are proportional to duration. Active marker glows brightly.
 *
 * Features:
 * - Octahedron geometry for crystal/gem appearance
 * - Holographic Fresnel material
 * - Size proportional to phase duration
 * - Active marker: bright glow + gentle rotation
 * - Inactive markers: dim + static
 */

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';

// Phase configuration with sizes proportional to duration
const PHASE_MARKERS = [
  { value: 4, angle: -Math.PI / 2.5, color: '#c9a06c', baseScale: 0.06 }, // Inhale - gold
  { value: 7, angle: 0, color: '#7ec5c4', baseScale: 0.085 }, // Hold - teal
  { value: 8, angle: Math.PI / 2.5, color: '#d4a0a0', baseScale: 0.095 }, // Exhale - rose
] as const;

interface PhaseMarkersProps {
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Height above globe center @default 0.8 */
  height?: number;
  /** Show number labels next to markers @default true */
  showLabels?: boolean;
  /** Override phase index for testing */
  testPhaseIndex?: number;
  /** Override phase progress for testing */
  testPhaseProgress?: number;
  /** Whether to use test values */
  useTestValues?: boolean;
}

/**
 * Holographic material for the phase markers
 */
function createHolographicMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uGlowColor: { value: new THREE.Color(color).multiplyScalar(1.5) },
      uOpacity: { value: 0.9 },
      uActive: { value: 0 },
      uFresnelPower: { value: 2.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uGlowColor;
      uniform float uOpacity;
      uniform float uActive;
      uniform float uFresnelPower;

      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), uFresnelPower);

        // Pulse when active
        float pulse = 0.9 + 0.1 * sin(uTime * 3.0) * uActive;

        // Brightness based on active state
        float brightness = mix(0.3, 1.0, uActive);

        // Mix base with glow at edges
        vec3 color = mix(uColor, uGlowColor, fresnel * (0.3 + uActive * 0.4));
        color *= brightness * pulse;

        float alpha = uOpacity * (0.5 + uActive * 0.5) + fresnel * 0.2;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

interface SingleMarkerProps {
  value: number;
  angle: number;
  color: string;
  baseScale: number;
  radius: number;
  height: number;
  isActive: boolean;
  phaseProgress: number;
  showLabel: boolean;
}

function SingleMarker({
  value,
  angle,
  color,
  baseScale,
  radius,
  height,
  isActive,
  phaseProgress,
  showLabel,
}: SingleMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create geometry and material
  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  const material = useMemo(() => createHolographicMaterial(color), [color]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const mesh = meshRef.current;
    const mat = materialRef.current;

    // Update time uniform
    mat.uniforms.uTime.value = state.clock.elapsedTime;

    // Smooth active state transition
    const targetActive = isActive ? 1 : 0;
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value,
      targetActive,
      0.1,
    );

    // Scale animation
    const targetScale = isActive ? baseScale * 1.4 : baseScale;
    const currentScale = THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.1);

    // Extra pulse at phase start
    let pulse = 1;
    if (isActive && phaseProgress < 0.1) {
      pulse = 1 + Math.sin((phaseProgress / 0.1) * Math.PI) * 0.15;
    }

    mesh.scale.setScalar(currentScale * pulse);

    // Rotate when active
    if (isActive) {
      mesh.rotation.y += 0.02;
      mesh.rotation.x = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  // Calculate position
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;

  return (
    <group position={[x, height, z]}>
      <mesh ref={meshRef} geometry={geometry} scale={baseScale}>
        <primitive object={material} ref={materialRef} attach="material" />
      </mesh>

      {showLabel && (
        <Text
          position={[0, -0.12, 0]}
          fontSize={0.08}
          color={color}
          anchorX="center"
          anchorY="top"
          fontWeight={500}
          fillOpacity={isActive ? 1 : 0.4}
          material-transparent={true}
          material-depthWrite={false}
        >
          {value}
        </Text>
      )}
    </group>
  );
}

export function PhaseMarkers({
  globeRadius = 1.5,
  height = 0.8,
  showLabels = true,
  testPhaseIndex,
  testPhaseProgress,
  useTestValues = false,
}: PhaseMarkersProps) {
  const currentPhaseRef = useRef(0);
  const phaseProgressRef = useRef(0);

  // Calculate phase from time or use test values
  useFrame(() => {
    if (useTestValues) {
      currentPhaseRef.current = testPhaseIndex ?? 0;
      phaseProgressRef.current = testPhaseProgress ?? 0;
      return;
    }

    // Time-based calculation
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;

    if (cycleTime < BREATH_PHASES.INHALE) {
      currentPhaseRef.current = 0;
      phaseProgressRef.current = cycleTime / BREATH_PHASES.INHALE;
    } else if (cycleTime < BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) {
      currentPhaseRef.current = 1;
      phaseProgressRef.current = (cycleTime - BREATH_PHASES.INHALE) / BREATH_PHASES.HOLD_IN;
    } else {
      currentPhaseRef.current = 2;
      phaseProgressRef.current =
        (cycleTime - BREATH_PHASES.INHALE - BREATH_PHASES.HOLD_IN) / BREATH_PHASES.EXHALE;
    }
  });

  const radius = globeRadius + 0.6;

  return (
    <group>
      {PHASE_MARKERS.map((marker, index) => (
        <SingleMarker
          key={marker.value}
          value={marker.value}
          angle={marker.angle}
          color={marker.color}
          baseScale={marker.baseScale}
          radius={radius}
          height={height}
          isActive={currentPhaseRef.current === index}
          phaseProgress={phaseProgressRef.current}
          showLabel={showLabels}
        />
      ))}
    </group>
  );
}
