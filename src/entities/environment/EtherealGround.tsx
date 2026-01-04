/**
 * EtherealGround - Hybrid ground + atmosphere system for depth perception
 *
 * Provides spatial grounding without losing the ethereal meditation aesthetic.
 * Combines multiple subtle effects that reinforce each other:
 *
 * 1. Soft circular ground plane (very subtle, opacity 0.03-0.08)
 * 2. Breath-synchronized mist rising from ground
 * 3. Soft contact shadow beneath particles
 * 4. Optional subtle grid visible at certain angles
 *
 * All effects are synchronized to the breathing cycle for immersion.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_TOTAL_CYCLE } from '../../constants';

interface EtherealGroundProps {
  /** Enable the entire ground system @default true */
  enabled?: boolean;
  /** Y position of ground plane @default -3.5 */
  groundY?: number;
  /** Ground plane radius @default 25 */
  groundRadius?: number;
  /** Ground plane base opacity (very subtle) @default 0.04 */
  groundOpacity?: number;
  /** Ground plane color @default '#e8e4e0' */
  groundColor?: string;
  /** Enable breath-synchronized mist @default true */
  showMist?: boolean;
  /** Number of mist particles @default 60 */
  mistCount?: number;
  /** Mist opacity @default 0.12 */
  mistOpacity?: number;
  /** Enable contact shadow @default true */
  showShadow?: boolean;
  /** Shadow radius @default 4 */
  shadowRadius?: number;
  /** Shadow opacity @default 0.08 */
  shadowOpacity?: number;
  /** Enable subtle grid pattern @default false */
  showGrid?: boolean;
  /** Grid opacity (very faint) @default 0.02 */
  gridOpacity?: number;
}

// Ground plane vertex shader with radial gradient
const groundVertexShader = `
  varying vec2 vUv;
  varying float vDistFromCenter;

  void main() {
    vUv = uv;
    // Calculate distance from center (0,0)
    vDistFromCenter = length(position.xz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Ground plane fragment shader - soft radial gradient with optional grid
const groundFragmentShader = `
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uGridOpacity;
  uniform float uTime;
  uniform float uBreathPhase;

  varying vec2 vUv;
  varying float vDistFromCenter;

  void main() {
    // Radial falloff - very soft edges
    float normalizedDist = vDistFromCenter / uRadius;
    float falloff = 1.0 - smoothstep(0.0, 1.0, normalizedDist);
    falloff = pow(falloff, 2.0); // Quadratic falloff for softer edge

    // Subtle pulsing with breath
    float breathPulse = 1.0 + (uBreathPhase * 0.1);

    // Base opacity with breath influence
    float alpha = uOpacity * falloff * breathPulse;

    // Optional grid pattern (only visible when uGridOpacity > 0)
    if (uGridOpacity > 0.001) {
      vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5);
      float gridLine = 1.0 - smoothstep(0.0, 0.03, min(grid.x, grid.y));

      // Grid is more visible toward center
      float gridFalloff = 1.0 - smoothstep(0.0, 0.5, normalizedDist);
      alpha += gridLine * uGridOpacity * gridFalloff * 0.5;
    }

    // Slight color warmth variation toward center
    vec3 color = uColor;
    color = mix(color, color * 1.05, falloff * 0.3);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Mist particle vertex shader
const mistVertexShader = `
  attribute float aOpacity;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aSize;

  uniform float uTime;
  uniform float uBreathPhase;
  uniform float uBaseOpacity;

  varying float vOpacity;
  varying float vFade;

  void main() {
    vec3 pos = position;

    // Rise with breath - particles rise on exhale (breathPhase going 1->0)
    float breathInfluence = 1.0 - uBreathPhase;
    float riseAmount = breathInfluence * aSpeed * 3.0;

    // Continuous gentle rise
    float continuousRise = mod(uTime * aSpeed * 0.3 + aPhase, 4.0);

    // Combine breath and continuous rise
    pos.y += riseAmount + continuousRise;

    // Gentle horizontal drift
    pos.x += sin(uTime * 0.5 + aPhase * 6.28) * 0.3;
    pos.z += cos(uTime * 0.4 + aPhase * 6.28) * 0.3;

    // Fade out as particles rise
    float heightFade = 1.0 - smoothstep(0.0, 4.0, pos.y - position.y);
    vFade = heightFade;

    // Opacity varies with breath - denser on exhale
    vOpacity = aOpacity * (0.5 + breathInfluence * 0.5);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Mist particle fragment shader
const mistFragmentShader = `
  uniform float uBaseOpacity;

  varying float vOpacity;
  varying float vFade;

  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Very soft falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.5); // Softer edge
    alpha *= vOpacity * uBaseOpacity * vFade;

    // Warm mist color
    vec3 color = vec3(0.98, 0.96, 0.94);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Contact shadow vertex shader
const shadowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Contact shadow fragment shader - soft radial shadow
const shadowFragmentShader = `
  uniform float uOpacity;
  uniform float uBreathPhase;

  varying vec2 vUv;

  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;

    // Soft circular shadow
    float shadow = 1.0 - smoothstep(0.0, 1.0, dist);
    shadow = pow(shadow, 1.5); // Softer falloff

    // Shadow intensity varies with breath - stronger when particles are lower (inhale)
    float breathInfluence = uBreathPhase * 0.3 + 0.7;

    float alpha = shadow * uOpacity * breathInfluence;

    // Dark shadow color
    gl_FragColor = vec4(0.2, 0.18, 0.16, alpha);
  }
`;

/**
 * GroundPlane - Soft circular ground with radial gradient
 */
const GroundPlane = memo(function GroundPlane({
  y,
  radius,
  opacity,
  color,
  gridOpacity,
}: {
  y: number;
  radius: number;
  opacity: number;
  color: string;
  gridOpacity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: opacity },
        uColor: { value: colorObj },
        uRadius: { value: radius },
        uGridOpacity: { value: gridOpacity },
        uTime: { value: 0 },
        uBreathPhase: { value: 0 },
      },
      vertexShader: groundVertexShader,
      fragmentShader: groundFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [opacity, colorObj, radius, gridOpacity]);

  // Animate breath phase
  useFrame(() => {
    if (!materialRef.current) return;

    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;

    // Calculate breath phase (simplified - full calc in breathCalc.ts)
    let breathPhase = 0;
    if (cycleTime < 4) {
      // Inhale
      breathPhase = cycleTime / 4;
    } else if (cycleTime < 11) {
      // Hold in
      breathPhase = 1;
    } else {
      // Exhale
      breathPhase = 1 - (cycleTime - 11) / 8;
    }

    materialRef.current.uniforms.uTime.value = now;
    materialRef.current.uniforms.uBreathPhase.value = breathPhase;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <circleGeometry args={[radius, 64]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

/**
 * MistParticles - Breath-synchronized mist rising from ground
 */
const MistParticles = memo(function MistParticles({
  y,
  count,
  opacity,
  radius,
}: {
  y: number;
  count: number;
  opacity: number;
  radius: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create geometry with particles distributed on ground
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute on circular area with more density toward center
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() ** 0.5 * radius * 0.8; // Square root for uniform area distribution

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y + Math.random() * 0.5; // Start just above ground
      positions[i * 3 + 2] = Math.sin(angle) * r;

      opacities[i] = 0.3 + Math.random() * 0.7;
      phases[i] = Math.random();
      speeds[i] = 0.5 + Math.random() * 1.0;
      sizes[i] = 8 + Math.random() * 12;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBreathPhase: { value: 0 },
        uBaseOpacity: { value: opacity },
      },
      vertexShader: mistVertexShader,
      fragmentShader: mistFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [count, y, radius, opacity]);

  // Animate
  useFrame(() => {
    if (!materialRef.current) return;

    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;

    // Calculate breath phase
    let breathPhase = 0;
    if (cycleTime < 4) {
      breathPhase = cycleTime / 4;
    } else if (cycleTime < 11) {
      breathPhase = 1;
    } else {
      breathPhase = 1 - (cycleTime - 11) / 8;
    }

    materialRef.current.uniforms.uTime.value = now;
    materialRef.current.uniforms.uBreathPhase.value = breathPhase;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
});

/**
 * ContactShadow - Soft shadow beneath the particle swarm
 */
const ContactShadow = memo(function ContactShadow({
  y,
  radius,
  opacity,
}: {
  y: number;
  radius: number;
  opacity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: opacity },
        uBreathPhase: { value: 0 },
      },
      vertexShader: shadowVertexShader,
      fragmentShader: shadowFragmentShader,
      transparent: true,
      depthWrite: false,
    });
  }, [opacity]);

  // Animate with breath
  useFrame(() => {
    if (!materialRef.current) return;

    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;

    let breathPhase = 0;
    if (cycleTime < 4) {
      breathPhase = cycleTime / 4;
    } else if (cycleTime < 11) {
      breathPhase = 1;
    } else {
      breathPhase = 1 - (cycleTime - 11) / 8;
    }

    materialRef.current.uniforms.uBreathPhase.value = breathPhase;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.01, 0]}>
      <circleGeometry args={[radius, 32]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

/**
 * EtherealGround - Main component combining all depth effects
 */
export const EtherealGround = memo(function EtherealGround({
  enabled = true,
  groundY = -3.5,
  groundRadius = 25,
  groundOpacity = 0.04,
  groundColor = '#e8e4e0',
  showMist = true,
  mistCount = 60,
  mistOpacity = 0.12,
  showShadow = true,
  shadowRadius = 4,
  shadowOpacity = 0.08,
  showGrid = false,
  gridOpacity = 0.02,
}: EtherealGroundProps) {
  if (!enabled) return null;

  return (
    <group>
      {/* Contact shadow - renders first (below ground) */}
      {showShadow && <ContactShadow y={groundY} radius={shadowRadius} opacity={shadowOpacity} />}

      {/* Ground plane with subtle gradient */}
      <GroundPlane
        y={groundY}
        radius={groundRadius}
        opacity={groundOpacity}
        color={groundColor}
        gridOpacity={showGrid ? gridOpacity : 0}
      />

      {/* Mist particles rising from ground */}
      {showMist && (
        <MistParticles
          y={groundY}
          count={mistCount}
          opacity={mistOpacity}
          radius={groundRadius * 0.4}
        />
      )}
    </group>
  );
});

export default EtherealGround;
