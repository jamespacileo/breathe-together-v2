/**
 * EnergyField - Fresnel-based energy bubble around the atmosphere
 *
 * Features:
 * - Glowing rim effect using Fresnel shader
 * - Pulses with breathing cycle
 * - Subtle color shifts
 * - Protective bubble aesthetic
 *
 * Implementation: Sphere with custom Fresnel shader
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface EnergyFieldProps {
  /**
   * Field radius
   * @default 5.5
   * @min 3
   * @max 10
   */
  radius?: number;

  /**
   * Base intensity of the glow
   * @default 0.3
   * @min 0
   * @max 1
   */
  intensity?: number;

  /**
   * Fresnel power (higher = thinner rim)
   * @default 2.5
   * @min 1
   * @max 5
   */
  fresnelPower?: number;

  /**
   * Primary color
   * @default '#66ddff'
   */
  color?: string;

  /**
   * Secondary color (pulse)
   * @default '#aaffcc'
   */
  pulseColor?: string;

  /**
   * Pulse speed
   * @default 0.5
   * @min 0.1
   * @max 2
   */
  pulseSpeed?: number;

  /**
   * Enable energy field
   * @default true
   */
  enabled?: boolean;
}

// Fresnel vertex shader
const fresnelVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fresnel fragment shader with pulsing
const fresnelFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  uniform float uIntensity;
  uniform float uFresnelPower;
  uniform float uTime;
  uniform float uBreathPhase;
  uniform vec3 uColor;
  uniform vec3 uPulseColor;
  uniform float uPulseSpeed;

  void main() {
    // Calculate fresnel factor
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = 1.0 - abs(dot(viewDir, vNormal));
    fresnel = pow(fresnel, uFresnelPower);

    // Pulse animation
    float pulse = sin(uTime * uPulseSpeed * 3.14159) * 0.5 + 0.5;

    // Breath-synchronized intensity
    float breathPulse = uBreathPhase;

    // Mix colors based on pulse
    vec3 color = mix(uColor, uPulseColor, pulse * 0.3);

    // Add subtle color variation from breath
    color = mix(color, uPulseColor, breathPulse * 0.2);

    // Final intensity combines base, pulse, and breath
    float finalIntensity = uIntensity * (0.7 + pulse * 0.3 + breathPulse * 0.3);

    // Apply fresnel
    float alpha = fresnel * finalIntensity;

    // Soft edge falloff
    alpha = smoothstep(0.0, 0.3, alpha) * alpha;

    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * EnergyField - Breathing-synchronized energy bubble
 */
export const EnergyField = memo(function EnergyField({
  radius = 5.5,
  intensity = 0.3,
  fresnelPower = 2.5,
  color = '#66ddff',
  pulseColor = '#aaffcc',
  pulseSpeed = 0.5,
  enabled = true,
}: EnergyFieldProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 64, 32), [radius]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: intensity },
        uFresnelPower: { value: fresnelPower },
        uTime: { value: 0 },
        uBreathPhase: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uPulseColor: { value: new THREE.Color(pulseColor) },
        uPulseSpeed: { value: pulseSpeed },
      },
      vertexShader: fresnelVertexShader,
      fragmentShader: fresnelFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide, // Render inside of sphere
      blending: THREE.AdditiveBlending,
    });
  }, [intensity, fresnelPower, color, pulseColor, pulseSpeed]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = state.clock.elapsedTime;

    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      mat.uniforms.uBreathPhase.value = phase;

      // Subtle scale pulse with breath
      const scale = 1 + phase * 0.03;
      meshRef.current.scale.setScalar(scale);
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!enabled) return null;

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
});

export default EnergyField;
