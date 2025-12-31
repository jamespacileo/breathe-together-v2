/**
 * UserShapeIndicator - Visual indicator for the user's own particle
 *
 * Displays:
 * - A pulsing ring outline around the user's shard
 * - A holographic line pointing to it from offset
 * - "YOU" text label
 *
 * The indicator follows the shard's position dynamically and
 * synchronizes with the breathing cycle for organic feel.
 */

import { Billboard, Line, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface UserShapeIndicatorProps {
  /**
   * Function that returns the current position of the user's shard
   * Called every frame to track the shard position
   */
  getShardPosition: () => THREE.Vector3 | null;

  /**
   * Size of the ring indicator relative to shard size
   * @default 1.2
   */
  ringScale?: number;

  /**
   * Opacity of the indicator elements
   * @default 0.8
   */
  opacity?: number;

  /**
   * Whether the indicator is visible
   * @default true
   */
  visible?: boolean;

  /**
   * Indicator color
   * @default '#ffffff'
   */
  color?: string;

  /**
   * Offset for the line and text (distance from shard center)
   * @default [1.5, 0.8, 0]
   */
  labelOffset?: [number, number, number];
}

// Holographic line material colors
const LINE_COLOR_PRIMARY = '#7ec8d4'; // Teal
const LINE_COLOR_SECONDARY = '#ffffff'; // White highlights

/**
 * Shader for holographic ring effect
 */
const ringVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const ringFragmentShader = `
uniform float time;
uniform float breathPhase;
uniform vec3 color;
uniform float opacity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Fresnel for edge glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Animated pulse
  float pulse = 0.7 + 0.3 * sin(time * 3.0 + breathPhase * 6.28);

  // Holographic scan lines
  float scanLine = sin(vUv.y * 30.0 + time * 2.0) * 0.5 + 0.5;
  scanLine = smoothstep(0.3, 0.7, scanLine) * 0.3;

  // Combine effects
  float alpha = (fresnel * 0.6 + scanLine + 0.2) * pulse * opacity;

  // Add slight color shift for holographic feel
  vec3 holoColor = mix(color, vec3(0.5, 0.8, 1.0), fresnel * 0.3);

  gl_FragColor = vec4(holoColor, alpha);
}
`;

export function UserShapeIndicator({
  getShardPosition,
  ringScale = 1.2,
  opacity = 0.8,
  visible = true,
  color = '#ffffff',
  labelOffset = [1.5, 0.8, 0],
}: UserShapeIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const world = useWorld();

  // Create ring shader material
  const ringMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        breathPhase: { value: 0 },
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    ringMaterialRef.current = material;
    return material;
  }, [color, opacity]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      ringMaterial.dispose();
    };
  }, [ringMaterial]);

  // Create ring geometry (torus)
  const ringGeometry = useMemo(() => {
    return new THREE.TorusGeometry(0.4 * ringScale, 0.03, 16, 32);
  }, [ringScale]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      ringGeometry.dispose();
    };
  }, [ringGeometry]);

  // Line points for holographic connection
  const linePoints = useMemo(
    () => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(...labelOffset)],
    [labelOffset],
  );

  // Animation loop
  useFrame((state) => {
    if (!groupRef.current || !visible) return;

    const position = getShardPosition();
    if (!position) {
      // Hide if no position available
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    groupRef.current.position.copy(position);

    // Get breathing phase for animation sync
    let currentBreathPhase = 0;
    try {
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        currentBreathPhase = breathEntity.get?.(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount
    }

    // Update shader uniforms
    if (ringMaterialRef.current) {
      ringMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
      ringMaterialRef.current.uniforms.breathPhase.value = currentBreathPhase;
    }

    // Rotate ring for dynamic effect
    const ringChild = groupRef.current.children[0];
    if (ringChild) {
      ringChild.rotation.z = state.clock.elapsedTime * 0.5;
      ringChild.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} name="User Shape Indicator">
      {/* Pulsing holographic ring around shard */}
      <mesh geometry={ringGeometry} material={ringMaterial} />

      {/* Second ring at perpendicular angle for depth */}
      <mesh geometry={ringGeometry} material={ringMaterial} rotation={[Math.PI / 2, 0, 0]} />

      {/* Holographic connection line */}
      <Line
        points={linePoints}
        color={LINE_COLOR_PRIMARY}
        lineWidth={2}
        transparent
        opacity={0.6}
        dashed
        dashScale={10}
        dashSize={0.1}
        dashOffset={0}
      />

      {/* "YOU" label - always faces camera */}
      <Billboard position={labelOffset} follow lockX={false} lockY={false} lockZ={false}>
        {/* Glow background */}
        <Text
          fontSize={0.25}
          color={LINE_COLOR_SECONDARY}
          anchorX="left"
          anchorY="middle"
          fillOpacity={0.3}
          outlineWidth={0.08}
          outlineColor={LINE_COLOR_PRIMARY}
          outlineOpacity={0.5}
        >
          YOU
        </Text>
        {/* Main text */}
        <Text
          fontSize={0.22}
          color={LINE_COLOR_SECONDARY}
          anchorX="left"
          anchorY="middle"
          fillOpacity={opacity}
        >
          YOU
        </Text>
      </Billboard>
    </group>
  );
}

export default UserShapeIndicator;
