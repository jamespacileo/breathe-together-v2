/**
 * HorizonGlow - 360° Atmospheric glow surrounding the scene
 *
 * Creates a luminous glow at the horizon visible from all angles,
 * suggesting a vast world extending in every direction. This technique
 * is used in games like Journey to create a sense of epic scale.
 *
 * Features:
 * - 360° cylindrical glow visible from any camera angle
 * - Gradient glow fading from horizon upward
 * - Warm color at horizon, cool fade toward sky
 * - Subtle pulse synchronized with breathing
 * - Ground haze layer for grounding effect
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface HorizonGlowProps {
  /** Base opacity @default 0.18 */
  opacity?: number;
  /** Enable glow @default true */
  enabled?: boolean;
}

const horizonVertexShader = `
  varying vec2 vUv;
  varying float vAngle;

  void main() {
    vUv = uv;
    // Calculate angle for shimmer variation around cylinder
    vAngle = atan(position.x, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const horizonFragmentShader = `
  varying vec2 vUv;
  varying float vAngle;
  uniform float uTime;
  uniform float uOpacity;

  void main() {
    // vUv.y: 0 = bottom (horizon line), 1 = top
    // Gradient from bottom (horizon) upward - more concentrated glow
    float horizonGlow = 1.0 - vUv.y;
    horizonGlow = pow(horizonGlow, 1.8); // Less aggressive falloff for more visibility

    // Secondary softer ambient glow extending higher
    float softGlow = 1.0 - smoothstep(0.0, 0.7, vUv.y);

    // Combine glows - more soft glow for visibility
    float glow = horizonGlow * 0.5 + softGlow * 0.5;

    // Color gradient - warm golden at horizon, cooler higher up
    vec3 horizonColor = vec3(1.0, 0.92, 0.82);   // Warm golden
    vec3 midColor = vec3(0.98, 0.95, 0.92);      // Soft warm white
    vec3 skyColor = vec3(0.92, 0.94, 0.98);      // Cool sky tint

    // Two-step gradient for richer color transition
    vec3 color = mix(horizonColor, midColor, smoothstep(0.0, 0.3, vUv.y));
    color = mix(color, skyColor, smoothstep(0.3, 0.8, vUv.y));

    // Breathing sync - gentle pulse
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.85 + sin(breathPhase * 6.28) * 0.15;

    // Subtle shimmer that varies around the cylinder
    float shimmer = sin(vAngle * 8.0 + uTime * 0.2) * 0.08 + 1.0;
    shimmer *= sin(vAngle * 3.0 - uTime * 0.15) * 0.05 + 1.0;

    float alpha = glow * uOpacity * breathMod * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

// Ground haze shader - adds sense of ground/atmosphere below
const groundHazeFragmentShader = `
  varying vec2 vUv;
  varying float vAngle;
  uniform float uTime;
  uniform float uOpacity;

  void main() {
    // Radial gradient from center - stronger at edges
    float dist = length(vUv - 0.5) * 2.0;
    float haze = smoothstep(0.2, 1.0, dist);
    haze = pow(haze, 1.5);

    // Soft warm color
    vec3 hazeColor = vec3(0.98, 0.95, 0.90);

    // Breathing sync
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.9 + sin(breathPhase * 6.28) * 0.1;

    // Subtle rotation variation
    float variation = sin(vAngle * 4.0 + uTime * 0.1) * 0.1 + 1.0;

    float alpha = haze * uOpacity * 0.4 * breathMod * variation;

    gl_FragColor = vec4(hazeColor, alpha);
  }
`;

export const HorizonGlow = memo(function HorizonGlow({
  opacity = 0.18,
  enabled = true,
}: HorizonGlowProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groundMaterialRef = useRef<THREE.ShaderMaterial>(null);

  // 360° cylinder surrounding the scene - camera is inside looking out
  // Open-ended cylinder (no caps) so we see through top/bottom
  const cylinderGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        150, // radiusTop - large enough to surround scene
        150, // radiusBottom
        80, // height - tall enough for gradient
        64, // radialSegments - smooth circle
        1, // heightSegments
        true, // openEnded - no caps
      ),
    [],
  );

  // Ground haze - circular plane below
  const groundGeometry = useMemo(() => new THREE.CircleGeometry(120, 64), []);

  const cylinderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
      },
      vertexShader: horizonVertexShader,
      fragmentShader: horizonFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide, // Render inside of cylinder (camera is inside)
      blending: THREE.AdditiveBlending,
    });
  }, [opacity]);

  const groundMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
      },
      vertexShader: horizonVertexShader,
      fragmentShader: groundHazeFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [opacity]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
    }
    if (groundMaterialRef.current) {
      groundMaterialRef.current.uniforms.uTime.value = time;
    }
  });

  useEffect(() => {
    return () => {
      cylinderGeometry.dispose();
      groundGeometry.dispose();
      cylinderMaterial.dispose();
      groundMaterial.dispose();
    };
  }, [cylinderGeometry, groundGeometry, cylinderMaterial, groundMaterial]);

  if (!enabled) return null;

  return (
    <group>
      {/* 360° horizon cylinder - positioned so bottom edge is at horizon line */}
      <mesh position={[0, -10, 0]} geometry={cylinderGeometry} frustumCulled={false}>
        <primitive object={cylinderMaterial} ref={materialRef} attach="material" />
      </mesh>

      {/* Ground haze plane - adds atmospheric grounding */}
      <mesh
        position={[0, -25, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={groundGeometry}
        frustumCulled={false}
      >
        <primitive object={groundMaterial} ref={groundMaterialRef} attach="material" />
      </mesh>
    </group>
  );
});

export default HorizonGlow;
