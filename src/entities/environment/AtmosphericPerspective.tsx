/**
 * AtmosphericPerspective - Distance-based color desaturation for depth cues
 *
 * Creates the perception of depth through:
 * - Distant objects appear more washed out (desaturated toward warm cream)
 * - Subtle blue-shift at extreme distances (aerial perspective)
 * - Soft haze layer that thickens with depth
 *
 * Implementation: Uses Three.js fog with custom color blending
 * The fog color is set to match the background gradient for seamless blending.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AtmosphericPerspectiveProps {
  /** Enable atmospheric perspective @default true */
  enabled?: boolean;
  /** Near distance where fog starts (no effect closer than this) @default 8 */
  nearDistance?: number;
  /** Far distance where fog is at maximum @default 50 */
  farDistance?: number;
  /** Fog color - should match background @default '#f5f0e8' */
  fogColor?: string;
  /** Maximum fog density at far distance @default 0.4 */
  density?: number;
}

/**
 * AtmosphericPerspective uses exponential fog for natural depth falloff
 *
 * Note: This affects all materials in the scene that respect fog.
 * Materials with fog: true (default for StandardMaterial, PhongMaterial)
 * Materials without fog: ShaderMaterial (unless you add fog uniforms)
 */
export function AtmosphericPerspective({
  enabled = true,
  nearDistance = 8,
  farDistance = 50,
  fogColor = '#f5f0e8',
  density = 0.4,
}: AtmosphericPerspectiveProps) {
  const { scene } = useThree();

  // Create and manage fog
  useEffect(() => {
    if (!enabled) {
      scene.fog = null;
      return;
    }

    // Use Fog (linear) for more control over near/far
    // FogExp2 would be more realistic but harder to tune
    const fog = new THREE.Fog(fogColor, nearDistance, farDistance);
    scene.fog = fog;

    return () => {
      scene.fog = null;
    };
  }, [enabled, nearDistance, farDistance, fogColor, scene]);

  // Update fog color when it changes
  useEffect(() => {
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(fogColor);
      scene.fog.near = nearDistance;
      scene.fog.far = farDistance;
    }
  }, [fogColor, nearDistance, farDistance, scene.fog]);

  return null; // No visual component - fog is applied to scene
}

/**
 * HazeLayer - Subtle visible haze planes at different depths
 *
 * Adds visible atmospheric layers that enhance depth perception
 * beyond what fog alone can provide.
 */
interface HazeLayerProps {
  /** Enable haze layers @default true */
  enabled?: boolean;
  /** Haze color @default '#faf8f5' */
  color?: string;
  /** Base opacity @default 0.08 */
  opacity?: number;
}

const hazeVertexShader = `
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mvPosition.z; // Positive depth value
  gl_Position = projectionMatrix * mvPosition;
}
`;

const hazeFragmentShader = `
uniform vec3 hazeColor;
uniform float opacity;
uniform float time;

varying vec2 vUv;
varying float vDepth;

// Simple noise for subtle variation
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  // Radial gradient from center
  vec2 center = vUv - 0.5;
  float dist = length(center);
  float radialFade = 1.0 - smoothstep(0.3, 0.7, dist);

  // Subtle animated noise for organic feel
  float n = noise(vUv * 10.0 + time * 0.1) * 0.1;

  // Final opacity with radial fade and noise
  float finalOpacity = opacity * radialFade * (0.9 + n);

  gl_FragColor = vec4(hazeColor, finalOpacity);
}
`;

export function HazeLayer({ enabled = true, color = '#faf8f5', opacity = 0.08 }: HazeLayerProps) {
  const materialRefs = useRef<THREE.ShaderMaterial[]>([]);

  // Haze layer configurations at different depths
  const hazeConfigs = useMemo(
    () => [
      { z: -15, scale: 40, opacity: opacity * 0.6 },
      { z: -25, scale: 50, opacity: opacity * 0.8 },
      { z: -40, scale: 60, opacity: opacity * 1.0 },
    ],
    [opacity],
  );

  // Create materials
  const materials = useMemo(() => {
    return hazeConfigs.map((config) => {
      return new THREE.ShaderMaterial({
        uniforms: {
          hazeColor: { value: new THREE.Color(color) },
          opacity: { value: config.opacity },
          time: { value: 0 },
        },
        vertexShader: hazeVertexShader,
        fragmentShader: hazeFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    });
  }, [color, hazeConfigs]);

  // Update material refs
  useEffect(() => {
    materialRefs.current = materials;
  }, [materials]);

  // Animate time uniform
  useFrame((state) => {
    for (const material of materialRefs.current) {
      material.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Update color when prop changes
  useEffect(() => {
    for (const material of materialRefs.current) {
      material.uniforms.hazeColor.value.set(color);
    }
  }, [color]);

  // Cleanup
  useEffect(() => {
    return () => {
      for (const material of materials) {
        material.dispose();
      }
    };
  }, [materials]);

  if (!enabled) return null;

  return (
    <group>
      {hazeConfigs.map((config, index) => (
        <mesh key={config.z} position={[0, 0, config.z]}>
          <planeGeometry args={[config.scale, config.scale]} />
          <primitive object={materials[index]} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export default AtmosphericPerspective;
