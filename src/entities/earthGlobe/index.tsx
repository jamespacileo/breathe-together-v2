/**
 * EarthGlobe - Central core visualization (stylized pastel sphere)
 *
 * Features:
 * - Gradient shader matching Monument Valley pastel aesthetic
 * - Colors blend between teal, peach, and cream (matching swarm palette)
 * - Subtle pulse animation (1.0 → 1.06, 6% scale change)
 * - Slow Y-axis rotation
 * - Soft fresnel rim for depth
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { breathPhase } from '../breath/traits';

// Vertex shader for globe
const globeVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment shader - pastel gradient with fresnel rim
const globeFragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

uniform float time;
uniform float breathPhase;

void main() {
  // Pastel colors matching the swarm (desaturated, soft)
  vec3 teal = vec3(0.525, 0.835, 0.780);      // Soft teal #86d5c7
  vec3 peach = vec3(0.945, 0.820, 0.725);     // Warm peach #f1d1b9
  vec3 cream = vec3(0.965, 0.945, 0.910);     // Soft cream #f6f1e8
  vec3 sage = vec3(0.690, 0.800, 0.690);      // Soft sage #b0ccb0

  // Latitude-based gradient (vertical bands)
  float latitude = vPosition.y / 1.5; // Normalized to sphere radius

  // Create soft horizontal bands
  float band1 = smoothstep(-0.6, 0.0, latitude);
  float band2 = smoothstep(0.0, 0.6, latitude);

  // Mix colors based on latitude
  vec3 baseColor = mix(sage, teal, band1);
  baseColor = mix(baseColor, peach, band2 * 0.6);
  baseColor = mix(baseColor, cream, smoothstep(0.4, 0.8, latitude) * 0.5);

  // Add subtle longitude variation
  float longitude = atan(vPosition.x, vPosition.z);
  float longVar = sin(longitude * 3.0 + time * 0.1) * 0.5 + 0.5;
  baseColor = mix(baseColor, cream, longVar * 0.15);

  // Fresnel rim for soft glow
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
  vec3 rimColor = vec3(1.0, 0.98, 0.95);

  // Breathing modulation - subtle color shift
  float breathMod = breathPhase * 0.1;
  baseColor = mix(baseColor, cream, breathMod);

  // Final color with rim
  vec3 finalColor = mix(baseColor, rimColor, fresnel * 0.4);

  // Subtle top-down lighting
  float topLight = smoothstep(-0.2, 0.8, vNormal.y) * 0.15;
  finalColor += vec3(1.0) * topLight;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  /** Core radius @default 1.5 */
  radius?: number;
  /** Resolution of the sphere (segments) @default 48 */
  resolution?: number;
  /** Enable continuous Y-axis rotation @default true */
  enableRotation?: boolean;
}

/**
 * EarthGlobe - Renders a stylized pastel sphere as the central core
 */
export function EarthGlobe({
  radius = 1.5,
  resolution = 48,
  enableRotation = true,
}: Partial<EarthGlobeProps> = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Create shader material with pastel gradient
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
        },
        vertexShader: globeVertexShader,
        fragmentShader: globeFragmentShader,
        side: THREE.FrontSide,
      }),
    [],
  );

  // Sphere geometry
  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, resolution, resolution),
    [radius, resolution],
  );

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  /**
   * Update globe scale, rotation, and shader uniforms
   */
  useFrame((state) => {
    if (!meshRef.current) return;

    // Update time uniform
    material.uniforms.time.value = state.clock.elapsedTime;

    try {
      // Get breath phase for animation
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get?.(breathPhase)?.value ?? 0;
        // Update shader uniform
        material.uniforms.breathPhase.value = phase;
        // Subtle pulse: 1.0 to 1.06 (6% scale change)
        const scale = 1.0 + phase * 0.06;
        meshRef.current.scale.set(scale, scale, scale);
      }

      // Slow rotation
      if (enableRotation) {
        meshRef.current.rotation.y -= 0.0008;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  return (
    <mesh
      ref={meshRef}
      name="Earth Globe"
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}

export default EarthGlobe;
