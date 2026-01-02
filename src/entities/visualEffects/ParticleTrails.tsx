/**
 * ParticleTrails - Comet-like trails following particle swarm shards
 *
 * Inspired by music visualizer motion blur effects. Renders glowing trails
 * behind the orbiting shards that respond to breathing:
 * - During movement (inhale/exhale): Longer, more visible trails
 * - During hold phases: Shorter, fading trails
 *
 * Uses line geometry with per-vertex alpha for smooth falloff.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

// Trail vertex shader
const trailVertexShader = `
attribute float alpha;
attribute vec3 trailColor;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vAlpha = alpha;
  vColor = trailColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Trail fragment shader
const trailFragmentShader = `
uniform float breathPhase;
uniform float globalOpacity;

varying float vAlpha;
varying vec3 vColor;

void main() {
  // Fade trail during hold phases
  float trailIntensity = vAlpha * globalOpacity;

  // Add subtle glow at the edges
  vec3 glowColor = vColor * 1.2;

  gl_FragColor = vec4(glowColor, trailIntensity);
}
`;

// Trail configuration
const TRAIL_LENGTH = 12; // Number of positions to store per trail
const SAMPLE_RATE = 3; // Sample every N frames

interface TrailPoint {
  position: THREE.Vector3;
  alpha: number;
}

interface Trail {
  points: TrailPoint[];
  color: THREE.Color;
}

interface ParticleTrailsProps {
  /** Enable trails @default true */
  enabled?: boolean;
  /** Maximum number of trails to render @default 48 */
  maxTrails?: number;
  /** Trail opacity @default 0.3 */
  opacity?: number;
}

export function ParticleTrails({
  enabled = true,
  maxTrails = 48,
  opacity = 0.3,
}: ParticleTrailsProps) {
  const { scene } = useThree();
  const world = useWorld();
  const frameCountRef = useRef(0);

  // Trail data storage
  const trailsRef = useRef<Trail[]>([]);

  // Line geometry and material
  const { lineGeometry, lineMaterial, lineMesh } = useMemo(() => {
    // Create buffer geometry for all trail lines
    const maxPoints = maxTrails * TRAIL_LENGTH;

    const positions = new Float32Array(maxPoints * 3);
    const alphas = new Float32Array(maxPoints);
    const colors = new Float32Array(maxPoints * 3);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    lineGeometry.setAttribute('trailColor', new THREE.BufferAttribute(colors, 3));

    const lineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        breathPhase: { value: 0 },
        globalOpacity: { value: opacity },
      },
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    lineMesh.frustumCulled = false;

    return { lineGeometry, lineMaterial, lineMesh };
  }, [maxTrails, opacity]);

  // Setup and cleanup
  useEffect(() => {
    scene.add(lineMesh);

    // Initialize trail data
    trailsRef.current = [];
    for (let i = 0; i < maxTrails; i++) {
      const trail: Trail = {
        points: [],
        color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.6, 0.7),
      };
      trailsRef.current.push(trail);
    }

    return () => {
      scene.remove(lineMesh);
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [scene, lineMesh, lineGeometry, lineMaterial, maxTrails]);

  // Animation loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Trail animation requires traversing scene graph, sampling positions, and updating buffer geometry - splitting would obscure the animation flow
  useFrame(() => {
    if (!enabled) return;

    frameCountRef.current++;
    const shouldSample = frameCountRef.current % SAMPLE_RATE === 0;

    // Get breath state
    let currentBreathPhase = 0;
    let currentPhaseType = 0;
    try {
      const breathEntity = world.queryFirst(breathPhase, phaseType);
      if (breathEntity) {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      }
    } catch {
      // Ignore
    }

    // Update material uniforms
    lineMaterial.uniforms.breathPhase.value = currentBreathPhase;

    // Adjust opacity based on phase
    // Trails are more visible during movement (inhale/exhale)
    let dynamicOpacity = opacity;
    if (currentPhaseType === 1 || currentPhaseType === 3) {
      // Hold phases - fade trails
      dynamicOpacity = opacity * 0.4;
    } else if (currentPhaseType === 0) {
      // Inhale - moderate trails
      dynamicOpacity = opacity * 0.8;
    } else {
      // Exhale - full trails
      dynamicOpacity = opacity;
    }
    lineMaterial.uniforms.globalOpacity.value = dynamicOpacity;

    // Find particle meshes in scene to track
    const particleGroup = scene.getObjectByName('Particle Swarm') as THREE.Group | undefined;
    if (!particleGroup) return;

    // Sample positions
    if (shouldSample) {
      let trailIndex = 0;
      particleGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.useRefraction && trailIndex < maxTrails) {
          const trail = trailsRef.current[trailIndex];

          // Get world position
          const worldPos = new THREE.Vector3();
          obj.getWorldPosition(worldPos);

          // Add new point at front
          trail.points.unshift({
            position: worldPos.clone(),
            alpha: 1.0,
          });

          // Trim to max length
          if (trail.points.length > TRAIL_LENGTH) {
            trail.points.pop();
          }

          // Update alpha falloff
          for (let i = 0; i < trail.points.length; i++) {
            trail.points[i].alpha = 1.0 - i / TRAIL_LENGTH;
          }

          // Get color from mesh
          const geometry = obj.geometry as THREE.IcosahedronGeometry;
          const colorAttr = geometry.attributes.color;
          if (colorAttr) {
            trail.color.setRGB(
              colorAttr.array[0] as number,
              colorAttr.array[1] as number,
              colorAttr.array[2] as number,
            );
          }

          trailIndex++;
        }
      });
    }

    // Update geometry buffers
    const posAttr = lineGeometry.attributes.position as THREE.BufferAttribute;
    const alphaAttr = lineGeometry.attributes.alpha as THREE.BufferAttribute;
    const colorAttr = lineGeometry.attributes.trailColor as THREE.BufferAttribute;

    let vertexIndex = 0;

    for (const trail of trailsRef.current) {
      // Draw line segments between consecutive points
      for (let i = 0; i < trail.points.length - 1; i++) {
        const p1 = trail.points[i];
        const p2 = trail.points[i + 1];

        if (vertexIndex + 1 >= maxTrails * TRAIL_LENGTH) break;

        // Point 1
        posAttr.array[vertexIndex * 3] = p1.position.x;
        posAttr.array[vertexIndex * 3 + 1] = p1.position.y;
        posAttr.array[vertexIndex * 3 + 2] = p1.position.z;
        alphaAttr.array[vertexIndex] = p1.alpha;
        colorAttr.array[vertexIndex * 3] = trail.color.r;
        colorAttr.array[vertexIndex * 3 + 1] = trail.color.g;
        colorAttr.array[vertexIndex * 3 + 2] = trail.color.b;
        vertexIndex++;

        // Point 2
        posAttr.array[vertexIndex * 3] = p2.position.x;
        posAttr.array[vertexIndex * 3 + 1] = p2.position.y;
        posAttr.array[vertexIndex * 3 + 2] = p2.position.z;
        alphaAttr.array[vertexIndex] = p2.alpha;
        colorAttr.array[vertexIndex * 3] = trail.color.r;
        colorAttr.array[vertexIndex * 3 + 1] = trail.color.g;
        colorAttr.array[vertexIndex * 3 + 2] = trail.color.b;
        vertexIndex++;
      }
    }

    // Zero out remaining vertices
    for (let i = vertexIndex; i < maxTrails * TRAIL_LENGTH; i++) {
      posAttr.array[i * 3] = 0;
      posAttr.array[i * 3 + 1] = 0;
      posAttr.array[i * 3 + 2] = 0;
      alphaAttr.array[i] = 0;
    }

    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    // Update draw range
    lineGeometry.setDrawRange(0, vertexIndex);
  });

  if (!enabled) return null;

  return null; // Mesh is added directly to scene
}

export default ParticleTrails;
