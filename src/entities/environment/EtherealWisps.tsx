/**
 * EtherealWisps - Flowing ribbon-like energy trails
 *
 * Creates gentle, aurora-like wisps that flow through the scene,
 * giving a sense of mystical energy and ethereal atmosphere.
 *
 * Features:
 * - Smooth bezier curves that undulate over time
 * - Soft gradient colors (pastel pinks, lavenders, teals)
 * - Breathing-synchronized opacity modulation
 * - Parallax depth for 3D feel
 *
 * Performance: Uses TubeGeometry with minimal segments
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface EtherealWispsProps {
  /** Number of wisps @default 5 */
  count?: number;
  /** Maximum opacity @default 0.15 */
  opacity?: number;
  /** Enable wisps @default true */
  enabled?: boolean;
}

interface WispConfig {
  id: string;
  baseY: number;
  baseZ: number;
  length: number;
  color: string;
  speed: number;
  amplitude: number;
  phaseOffset: number;
  thickness: number;
}

// Pastel wisp configurations
const WISP_CONFIGS: WispConfig[] = [
  {
    id: 'wisp-pink',
    baseY: 3,
    baseZ: -25,
    length: 20,
    color: '#f8c4d4',
    speed: 0.15,
    amplitude: 2.5,
    phaseOffset: 0,
    thickness: 0.08,
  },
  {
    id: 'wisp-lavender',
    baseY: -2,
    baseZ: -30,
    length: 25,
    color: '#d4c8e8',
    speed: 0.12,
    amplitude: 3,
    phaseOffset: 1.5,
    thickness: 0.1,
  },
  {
    id: 'wisp-teal',
    baseY: 5,
    baseZ: -35,
    length: 18,
    color: '#c4e8e4',
    speed: 0.18,
    amplitude: 2,
    phaseOffset: 3,
    thickness: 0.06,
  },
  {
    id: 'wisp-peach',
    baseY: -4,
    baseZ: -20,
    length: 22,
    color: '#f8dcc8',
    speed: 0.14,
    amplitude: 2.8,
    phaseOffset: 4.5,
    thickness: 0.07,
  },
  {
    id: 'wisp-mint',
    baseY: 1,
    baseZ: -40,
    length: 30,
    color: '#c8e8d4',
    speed: 0.1,
    amplitude: 3.5,
    phaseOffset: 2.2,
    thickness: 0.09,
  },
];

// Shader for soft glowing wisps
const wispVertexShader = `
  varying vec2 vUv;
  varying float vDistance;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDistance = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const wispFragmentShader = `
  varying vec2 vUv;
  varying float vDistance;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;

  void main() {
    // Soft edge falloff using UV.y (across the tube)
    float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
    edge = smoothstep(0.0, 0.5, edge);

    // Fade at ends of the wisp
    float endFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);

    // Gentle shimmer
    float shimmer = sin(vUv.x * 20.0 + uTime * 2.0) * 0.1 + 0.9;

    // Depth fade
    float depthFade = smoothstep(60.0, 15.0, vDistance);

    float alpha = edge * endFade * shimmer * depthFade * uOpacity;

    // Slightly brighter core
    vec3 color = uColor + vec3(0.1) * edge;

    gl_FragColor = vec4(color, alpha);
  }
`;

const Wisp = memo(function Wisp({
  config,
  baseOpacity,
}: {
  config: WispConfig;
  baseOpacity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.TubeGeometry | null>(null);

  // Create initial curve
  const curve = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (t - 0.5) * config.length;
      const y = config.baseY;
      const z = config.baseZ;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [config.length, config.baseY, config.baseZ]);

  // Create material
  const material = useMemo(() => {
    const color = new THREE.Color(config.color);
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color },
        uOpacity: { value: baseOpacity },
        uTime: { value: config.phaseOffset },
      },
      vertexShader: wispVertexShader,
      fragmentShader: wispFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [config.color, config.phaseOffset, baseOpacity]);

  // Animate wisp curve
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime * config.speed + config.phaseOffset;

    // Update curve points for flowing motion
    const points = curve.points;
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const x = (t - 0.5) * config.length;

      // Wave motion with multiple frequencies
      const wave1 = Math.sin(time + t * Math.PI * 2) * config.amplitude * 0.5;
      const wave2 = Math.sin(time * 0.7 + t * Math.PI * 3 + 1) * config.amplitude * 0.3;
      const wave3 = Math.cos(time * 0.5 + t * Math.PI) * config.amplitude * 0.2;

      points[i].set(
        x + wave3 * 0.5,
        config.baseY + wave1 + wave2,
        config.baseZ + Math.sin(time * 0.3 + t * Math.PI) * 2,
      );
    }
    curve.updateArcLengths();

    // Recreate geometry with updated curve
    if (geometryRef.current) {
      geometryRef.current.dispose();
    }
    geometryRef.current = new THREE.TubeGeometry(curve, 32, config.thickness, 8, false);
    meshRef.current.geometry = geometryRef.current;

    // Update uniforms
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

    // Breathing-synchronized opacity
    const breathPhase = (Date.now() % 19000) / 19000;
    const breathMod = 0.7 + Math.sin(breathPhase * Math.PI * 2) * 0.3;
    materialRef.current.uniforms.uOpacity.value = baseOpacity * breathMod;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      material.dispose();
    };
  }, [material]);

  // Initial geometry
  const initialGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, config.thickness, 8, false);
  }, [curve, config.thickness]);

  return (
    <mesh ref={meshRef} geometry={initialGeometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export const EtherealWisps = memo(function EtherealWisps({
  count = 5,
  opacity = 0.15,
  enabled = true,
}: EtherealWispsProps) {
  const configs = useMemo(() => WISP_CONFIGS.slice(0, count), [count]);

  if (!enabled) return null;

  return (
    <group>
      {configs.map((config) => (
        <Wisp key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </group>
  );
});

export default EtherealWisps;
