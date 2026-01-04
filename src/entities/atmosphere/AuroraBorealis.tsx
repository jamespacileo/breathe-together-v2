/**
 * AuroraBorealis - Northern lights haze effect at poles
 *
 * Features:
 * - Flowing curtains of light at top/bottom of atmosphere
 * - Color shifts with breathing (teal → green → purple)
 * - Gentle wave animation using noise
 * - Soft glow using additive blending
 *
 * Implementation: Shader-based plane with animated noise
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface AuroraBorealisProps {
  /**
   * Aurora intensity
   * @default 0.4
   * @min 0
   * @max 1
   */
  intensity?: number;

  /**
   * Vertical position (height above/below center)
   * @default 4
   * @min 2
   * @max 8
   */
  height?: number;

  /**
   * Horizontal spread
   * @default 8
   * @min 4
   * @max 15
   */
  spread?: number;

  /**
   * Animation speed
   * @default 0.3
   * @min 0.1
   * @max 1
   */
  speed?: number;

  /**
   * Show aurora at north pole
   * @default true
   */
  showNorth?: boolean;

  /**
   * Show aurora at south pole
   * @default false
   */
  showSouth?: boolean;

  /**
   * Enable aurora effect
   * @default true
   */
  enabled?: boolean;
}

// Aurora vertex shader
const auroraVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Aurora fragment shader with noise-based curtain effect
const auroraFragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  uniform float uTime;
  uniform float uIntensity;
  uniform float uBreathPhase;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;

  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Vertical curtain effect
    float verticalFade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

    // Horizontal wave using noise
    float wave1 = snoise(vec2(vUv.x * 2.0 + uTime * 0.5, uTime * 0.2)) * 0.5 + 0.5;
    float wave2 = snoise(vec2(vUv.x * 4.0 - uTime * 0.3, uTime * 0.15 + 10.0)) * 0.5 + 0.5;
    float wave3 = snoise(vec2(vUv.x * 1.5 + uTime * 0.2, uTime * 0.25 + 20.0)) * 0.5 + 0.5;

    float curtain = (wave1 * 0.4 + wave2 * 0.35 + wave3 * 0.25);

    // Vertical streaks (aurora curtains)
    float streaks = snoise(vec2(vUv.x * 10.0, vUv.y * 2.0 + uTime * 0.5));
    streaks = smoothstep(-0.3, 0.8, streaks);

    // Color mixing based on breath phase
    vec3 color;
    float colorMix = uBreathPhase;

    // Transition: color1 → color2 → color3 based on breath
    if (colorMix < 0.5) {
      color = mix(uColor1, uColor2, colorMix * 2.0);
    } else {
      color = mix(uColor2, uColor3, (colorMix - 0.5) * 2.0);
    }

    // Add some color variation from noise
    float colorNoise = snoise(vec2(vUv.x * 3.0 + uTime * 0.1, vUv.y * 2.0));
    color = mix(color, uColor3, colorNoise * 0.2 + 0.1);

    // Final alpha
    float alpha = curtain * verticalFade * streaks * uIntensity;
    alpha *= 0.6; // Overall transparency

    // Soft edge falloff on X
    float xFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    alpha *= xFade;

    gl_FragColor = vec4(color, alpha);
  }
`;

const AuroraCurtain = memo(function AuroraCurtain({
  position,
  rotation,
  intensity,
  spread,
  speed,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  intensity: number;
  spread: number;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  const geometry = useMemo(() => new THREE.PlaneGeometry(spread, 3, 32, 16), [spread]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uBreathPhase: { value: 0 },
        uColor1: { value: new THREE.Color('#00ffaa') }, // Teal/cyan
        uColor2: { value: new THREE.Color('#44ff88') }, // Green
        uColor3: { value: new THREE.Color('#aa88ff') }, // Purple
      },
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [intensity]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = state.clock.elapsedTime * speed;

    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      mat.uniforms.uBreathPhase.value = phase;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} geometry={geometry}>
      <primitive object={material} attach="material" />
    </mesh>
  );
});

/**
 * AuroraBorealis - Northern/Southern lights effect
 */
export const AuroraBorealis = memo(function AuroraBorealis({
  intensity = 0.4,
  height = 4,
  spread = 8,
  speed = 0.3,
  showNorth = true,
  showSouth = false,
  enabled = true,
}: AuroraBorealisProps) {
  if (!enabled) return null;

  return (
    <group>
      {/* North pole aurora */}
      {showNorth && (
        <AuroraCurtain
          position={[0, height, 0]}
          rotation={[-Math.PI / 6, 0, 0]}
          intensity={intensity}
          spread={spread}
          speed={speed}
        />
      )}

      {/* South pole aurora */}
      {showSouth && (
        <AuroraCurtain
          position={[0, -height, 0]}
          rotation={[Math.PI / 6, 0, Math.PI]}
          intensity={intensity}
          spread={spread}
          speed={speed}
        />
      )}
    </group>
  );
});

export default AuroraBorealis;
