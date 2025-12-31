/**
 * UserShapeIndicator - Visual indicator for the current user's shard
 *
 * Uses classic game dev holographic techniques:
 * - Fresnel rim glow (edges glow brighter than center)
 * - Scanlines with noise/dithering pattern
 * - Chromatic aberration (RGB color separation)
 * - Vertex wobble for organic movement
 * - Holographic shell around the shard (scaled icosahedron outline)
 * - Billboard "YOU" label that faces camera
 *
 * The indicator follows the shard's position in real-time.
 */

import { Billboard, Text } from '@react-three/drei';
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
 * Holographic shell shader - classic game dev hologram effect
 *
 * Techniques used:
 * - Fresnel rim lighting (view-angle based glow)
 * - Animated scanlines with noise
 * - Chromatic aberration on edges
 * - Dithering pattern for retro transparency
 * - Vertex displacement for wobble
 */
function createHologramShellMaterial(color: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      uniform float uTime;

      // Simple noise function for vertex wobble
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);

        // Vertex wobble - subtle displacement along normal
        float wobble = sin(uTime * 2.0 + position.y * 4.0) * 0.02;
        wobble += sin(uTime * 3.0 + position.x * 5.0) * 0.01;
        vec3 displaced = position + normal * wobble;

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;

      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      // Hash function for noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      // Dithering pattern (8x8 Bayer matrix approximation)
      float dither(vec2 coord) {
        vec2 p = floor(mod(coord, 8.0));
        float d = mod(p.x + p.y * 2.0, 4.0) / 4.0;
        return d * 0.5 + 0.5;
      }

      void main() {
        // Fresnel rim effect - edges glow brighter
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = 1.0 - abs(dot(viewDir, vNormal));
        fresnel = pow(fresnel, 2.0);

        // Scanlines - horizontal lines that scroll upward
        float scanlineFreq = 60.0;
        float scanline = sin(vWorldPosition.y * scanlineFreq - uTime * 4.0) * 0.5 + 0.5;
        scanline = pow(scanline, 4.0) * 0.6 + 0.4;

        // Noise/static pattern
        float staticNoise = hash(vUv * 100.0 + uTime * 10.0);
        staticNoise = staticNoise * 0.15 + 0.85;

        // Triangle edge highlight (based on barycentric-like effect)
        float edgeGlow = pow(fresnel, 1.5) * 1.5;

        // Dithering for retro transparency
        float dith = dither(gl_FragCoord.xy);

        // Chromatic aberration - shift RGB based on view angle
        float aberration = fresnel * 0.3;
        vec3 chromaColor = vec3(
          uColor.r + aberration * 0.5,
          uColor.g,
          uColor.b - aberration * 0.3
        );

        // Pulsing glow
        float pulse = sin(uTime * 2.5) * 0.2 + 0.8;

        // Combine all effects
        float alpha = fresnel * scanline * staticNoise * pulse * uOpacity;
        alpha = alpha * dith; // Apply dithering
        alpha = clamp(alpha, 0.0, 1.0);

        // Add edge glow to color
        vec3 finalColor = chromaColor + vec3(edgeGlow * 0.3);

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Holographic line material for the connecting beam
 */
function createHoloBeamMaterial(color: THREE.Color, opacity: number) {
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

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        // Energy flowing upward
        float flow = fract(vUv.y * 3.0 - uTime * 2.0);
        flow = pow(flow, 2.0);

        // Scanlines
        float scanline = sin(vUv.y * 80.0 - uTime * 5.0) * 0.5 + 0.5;
        scanline = pow(scanline, 3.0);

        // Noise flicker
        float noise = hash(vUv + uTime * 5.0) * 0.3 + 0.7;

        // Fade at edges (horizontal)
        float xFade = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);

        // Fade at bottom, bright at top
        float yFade = smoothstep(0.0, 0.2, vUv.y);

        // Combine
        float alpha = (flow * 0.5 + scanline * 0.5) * noise * xFade * yFade * uOpacity;

        // Chromatic shift
        vec3 chromaColor = vec3(
          uColor.r + flow * 0.2,
          uColor.g,
          uColor.b - flow * 0.1
        );

        gl_FragColor = vec4(chromaColor, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Glowing ring material with chase effect
 */
function createChaseRingMaterial(color: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vPosition;

      void main() {
        // Chase light effect around the ring
        float angle = atan(vPosition.z, vPosition.x);
        float chase = sin(angle * 2.0 - uTime * 4.0) * 0.5 + 0.5;
        chase = pow(chase, 3.0);

        // Secondary chase going opposite direction
        float chase2 = sin(angle * 3.0 + uTime * 3.0) * 0.5 + 0.5;
        chase2 = pow(chase2, 4.0) * 0.5;

        // Pulse
        float pulse = sin(uTime * 2.0) * 0.15 + 0.85;

        float alpha = (0.3 + chase * 0.5 + chase2) * pulse * uOpacity;

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
  const shellMaterial = useMemo(
    () => createHologramShellMaterial(threeColor, opacity),
    [threeColor, opacity],
  );

  const beamMaterial = useMemo(
    () => createHoloBeamMaterial(threeColor, opacity),
    [threeColor, opacity],
  );

  const ringMaterial = useMemo(
    () => createChaseRingMaterial(threeColor, opacity),
    [threeColor, opacity],
  );

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      shellMaterial.dispose();
      beamMaterial.dispose();
      ringMaterial.dispose();
    };
  }, [shellMaterial, beamMaterial, ringMaterial]);

  // Update position and animate shaders
  useFrame((state) => {
    if (!groupRef.current || !positionRef.current) return;

    groupRef.current.position.copy(positionRef.current);

    const time = state.clock.elapsedTime;
    shellMaterial.uniforms.uTime.value = time;
    beamMaterial.uniforms.uTime.value = time;
    ringMaterial.uniforms.uTime.value = time;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {/* Holographic shell - scaled icosahedron outline around the shard */}
      <mesh scale={1.25}>
        <icosahedronGeometry args={[0.5, 0]} />
        <primitive object={shellMaterial} attach="material" />
      </mesh>

      {/* Chase ring around the shard */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.75, 0.025, 16, 48]} />
        <primitive object={ringMaterial} attach="material" />
      </mesh>

      {/* Energy beam connecting to label */}
      <mesh position={[0, 1.0, 0]}>
        <planeGeometry args={[0.06, 1.2]} />
        <primitive object={beamMaterial} attach="material" />
      </mesh>

      {/* Billboard "YOU" label - always faces camera */}
      <Billboard position={[0, 1.8, 0]} follow={true}>
        <Text
          fontSize={0.22}
          color={color}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.12}
          outlineWidth={0.02}
          outlineColor="#000000"
          outlineOpacity={0.4}
        >
          YOU
        </Text>
      </Billboard>

      {/* Small indicator dot at connection point */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.8} />
      </mesh>
    </group>
  );
}

export default UserShapeIndicator;
