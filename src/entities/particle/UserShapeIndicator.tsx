/**
 * UserShapeIndicator - Visual indicator for the current user's shard
 *
 * Displays:
 * - A glowing outline ring around the user's icosahedron
 * - A holographic vertical line extending upward
 * - A "YOU" label above the shard
 *
 * The indicator follows the shard's position in real-time using a position ref
 * that's updated by ParticleSwarm each frame.
 */

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface UserShapeIndicatorProps {
  /** Ref containing the current user's world position (updated by ParticleSwarm each frame) */
  positionRef: React.RefObject<THREE.Vector3 | null>;
  /** Color of the indicator (matches the user's mood color) */
  color?: string;
  /** Whether the indicator should be visible */
  visible?: boolean;
  /** Opacity of the indicator elements */
  opacity?: number;
}

/**
 * Holographic line shader material
 * Creates a glowing, animated line effect
 */
function createHolographicMaterial(color: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        // Scanline effect
        float scanline = sin(vUv.y * 40.0 - uTime * 3.0) * 0.5 + 0.5;
        scanline = pow(scanline, 3.0);

        // Fade at edges
        float edgeFade = smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);

        // Pulse effect
        float pulse = sin(uTime * 2.0) * 0.15 + 0.85;

        // Combine
        float alpha = (0.4 + scanline * 0.4) * edgeFade * pulse * uOpacity;

        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Ring outline shader material
 * Creates a glowing ring around the shard
 */
function createRingMaterial(color: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;

      void main() {
        // Rotating glow effect
        float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
        float rotatingGlow = sin(angle * 2.0 + uTime * 2.0) * 0.3 + 0.7;

        // Pulse
        float pulse = sin(uTime * 1.5) * 0.2 + 0.8;

        float alpha = rotatingGlow * pulse * uOpacity;

        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function UserShapeIndicator({
  positionRef,
  color = '#ffffff',
  visible = true,
  opacity = 0.8,
}: UserShapeIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Memoize color conversion
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  // Create materials with proper cleanup
  const holographicMaterial = useMemo(
    () => createHolographicMaterial(threeColor, opacity),
    [threeColor, opacity],
  );

  const ringMaterial = useMemo(
    () => createRingMaterial(threeColor, opacity),
    [threeColor, opacity],
  );

  // Cleanup materials on unmount or when dependencies change
  useEffect(() => {
    return () => {
      holographicMaterial.dispose();
      ringMaterial.dispose();
    };
  }, [holographicMaterial, ringMaterial]);

  // Update position and animate
  useFrame((state) => {
    if (!groupRef.current || !positionRef.current) return;

    // Follow the shard's position
    groupRef.current.position.copy(positionRef.current);

    // Update shader time uniforms
    const time = state.clock.elapsedTime;
    holographicMaterial.uniforms.uTime.value = time;
    ringMaterial.uniforms.uTime.value = time;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {/* Glowing ring outline around the shard */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[0.7, 0.03, 16, 48]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>

      {/* Secondary larger ring for depth */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[0.85, 0.015, 16, 48]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>

      {/* Holographic vertical line */}
      <mesh position={[0, 1.2, 0]}>
        <planeGeometry args={[0.04, 1.6]} />
        <primitive object={holographicMaterial} attach="material" />
      </mesh>

      {/* "YOU" label */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.25}
        color={color}
        anchorX="center"
        anchorY="bottom"
        font="/fonts/DM_Sans/DMSans-Medium.ttf"
        letterSpacing={0.15}
        outlineWidth={0.015}
        outlineColor="#000000"
        outlineOpacity={0.3}
      >
        YOU
      </Text>

      {/* Subtle glow point at top of line */}
      <mesh position={[0, 2.0, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.6} />
      </mesh>
    </group>
  );
}

export default UserShapeIndicator;
