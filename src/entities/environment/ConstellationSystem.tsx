/**
 * ConstellationSystem - Instanced star rendering with constellation line connections
 *
 * Performance optimizations:
 * - Single InstancedMesh for all constellation stars (one draw call)
 * - Single BufferGeometry for all line segments (one draw call)
 * - Animation via shader uniforms (no JS matrix updates per frame)
 *
 * Features:
 * - 12+ real constellations with accurate patterns
 * - Subtle twinkling animation
 * - Glowing star appearance with size falloff
 * - Semi-transparent connection lines
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CONSTELLATIONS, TOTAL_CONSTELLATION_STARS } from './constellationData';

interface ConstellationSystemProps {
  /** Radius of the celestial sphere @default 80 */
  radius?: number;
  /** Base star size @default 0.35 */
  starSize?: number;
  /** Line opacity @default 0.5 */
  lineOpacity?: number;
  /** Enable twinkling animation @default true */
  twinkle?: boolean;
  /** Overall visibility @default true */
  visible?: boolean;
}

// Vertex shader for instanced stars
const starVertexShader = `
attribute float brightness;
attribute float twinklePhase;

uniform float time;
uniform float baseSize;

varying float vBrightness;
varying float vTwinkle;

void main() {
  // Calculate position
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

  // Twinkle calculation - more visible range
  float twinkle = 0.8 + 0.2 * sin(time * 2.0 + twinklePhase * 6.28);

  // Size based on brightness and twinkle - boosted for visibility
  float size = baseSize * brightness * twinkle * 1.5;

  // Distance-based attenuation (stars further away appear smaller)
  float dist = length(mvPosition.xyz);
  size *= 400.0 / dist;

  // Minimum size to ensure visibility
  gl_PointSize = max(size, 3.0);
  gl_Position = projectionMatrix * mvPosition;

  vBrightness = brightness;
  vTwinkle = twinkle;
}
`;

// Fragment shader for glowing stars - enhanced visibility with Kurzgesagt-style glow
const starFragmentShader = `
varying float vBrightness;
varying float vTwinkle;

void main() {
  // Circular point with multi-layer soft glow
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);

  // Bright sharp core
  float core = smoothstep(0.5, 0.02, dist) * 1.5;

  // Inner glow for softness
  float innerGlow = smoothstep(0.5, 0.1, dist) * 1.0;

  // Extended outer glow for painterly feel
  float outerGlow = smoothstep(0.5, 0.0, dist) * 0.6;

  // Combine layers with boosted alpha for excellent visibility
  float alpha = (core + innerGlow + outerGlow) * vBrightness * vTwinkle;

  // Star color - warm white with subtle color variation based on brightness
  vec3 warmWhite = vec3(1.0, 0.97, 0.92);
  vec3 coolBlue = vec3(0.9, 0.95, 1.0);
  vec3 color = mix(warmWhite, coolBlue, vBrightness * 0.5);

  // Boost core brightness for prominent appearance
  color *= 1.4;

  // Add subtle color tint to outer glow
  vec3 glowTint = vec3(0.85, 0.9, 1.0) * outerGlow * 0.3;
  color += glowTint;

  gl_FragColor = vec4(color, min(alpha, 1.0));
}
`;

// Line vertex shader
const lineVertexShader = `
attribute vec3 color;
varying vec3 vColor;

void main() {
  vColor = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Line fragment shader - soft ethereal glow for painted night sky aesthetic
const lineFragmentShader = `
uniform float opacity;
varying vec3 vColor;

void main() {
  // Softer, more ethereal constellation lines
  // Blend color with soft white for a gentle glow
  vec3 softWhite = vec3(0.7, 0.75, 0.85);
  vec3 lineColor = mix(softWhite, vColor * 1.3, 0.5);

  // Subtle opacity for delicate appearance
  float softOpacity = opacity * 0.7;

  gl_FragColor = vec4(lineColor, softOpacity);
}
`;

/**
 * Convert spherical coordinates to 3D cartesian
 * theta: horizontal angle [0,1] -> [0, 2π]
 * phi: vertical angle [0,1] -> [0, π]
 */
function sphericalToCartesian(theta: number, phi: number, radius: number): THREE.Vector3 {
  const azimuth = theta * Math.PI * 2;
  const polar = phi * Math.PI;

  return new THREE.Vector3(
    radius * Math.sin(polar) * Math.cos(azimuth),
    radius * Math.cos(polar),
    radius * Math.sin(polar) * Math.sin(azimuth),
  );
}

export const ConstellationSystem = memo(function ConstellationSystem({
  radius = 80,
  starSize = 0.35,
  lineOpacity = 0.5,
  twinkle = true,
  visible = true,
}: ConstellationSystemProps) {
  const starsRef = useRef<THREE.InstancedMesh>(null);
  const linesMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const starsMaterialRef = useRef<THREE.ShaderMaterial>(null);

  // Create star geometry (simple point)
  const starGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  // Create star material
  const starMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          baseSize: { value: starSize * 100 },
        },
        vertexShader: starVertexShader,
        fragmentShader: starFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [starSize],
  );

  // Create line material
  const lineMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          opacity: { value: lineOpacity },
        },
        vertexShader: lineVertexShader,
        fragmentShader: lineFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [lineOpacity],
  );

  // Create line geometry with all constellation connections
  const lineGeometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    for (const constellation of CONSTELLATIONS) {
      // Parse constellation line color
      const color = new THREE.Color(constellation.color);

      for (const [startIdx, endIdx] of constellation.connections) {
        const startStar = constellation.stars[startIdx];
        const endStar = constellation.stars[endIdx];

        const startPos = sphericalToCartesian(startStar.theta, startStar.phi, radius);
        const endPos = sphericalToCartesian(endStar.theta, endStar.phi, radius);

        positions.push(startPos.x, startPos.y, startPos.z);
        positions.push(endPos.x, endPos.y, endPos.z);

        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    return geometry;
  }, [radius]);

  // Setup star instances with positions and attributes
  useEffect(() => {
    if (!starsRef.current) return;

    const mesh = starsRef.current;
    const dummy = new THREE.Object3D();

    // Instance attributes
    const brightnesses = new Float32Array(TOTAL_CONSTELLATION_STARS);
    const twinklePhases = new Float32Array(TOTAL_CONSTELLATION_STARS);

    let instanceIndex = 0;

    for (const constellation of CONSTELLATIONS) {
      for (const star of constellation.stars) {
        const pos = sphericalToCartesian(star.theta, star.phi, radius);

        dummy.position.copy(pos);
        dummy.lookAt(0, 0, 0);
        dummy.updateMatrix();

        mesh.setMatrixAt(instanceIndex, dummy.matrix);

        brightnesses[instanceIndex] = star.brightness;
        twinklePhases[instanceIndex] = Math.random();

        instanceIndex++;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;

    // Add custom attributes
    mesh.geometry.setAttribute('brightness', new THREE.InstancedBufferAttribute(brightnesses, 1));
    mesh.geometry.setAttribute(
      'twinklePhase',
      new THREE.InstancedBufferAttribute(twinklePhases, 1),
    );
  }, [radius]);

  // Animation loop
  useFrame((state) => {
    if (starsMaterialRef.current && twinkle) {
      starsMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      starGeometry.dispose();
      starMaterial.dispose();
      lineMaterial.dispose();
      lineGeometry.dispose();
    };
  }, [starGeometry, starMaterial, lineMaterial, lineGeometry]);

  if (!visible) return null;

  return (
    <group renderOrder={100}>
      {/* Constellation lines - render first so stars appear on top */}
      <lineSegments geometry={lineGeometry} renderOrder={100}>
        <primitive object={lineMaterial} ref={linesMaterialRef} attach="material" />
      </lineSegments>

      {/* Constellation stars - render after lines */}
      <instancedMesh
        ref={starsRef}
        args={[starGeometry, starMaterial, TOTAL_CONSTELLATION_STARS]}
        renderOrder={101}
      >
        <primitive object={starMaterial} ref={starsMaterialRef} attach="material" />
      </instancedMesh>
    </group>
  );
});

export default ConstellationSystem;
