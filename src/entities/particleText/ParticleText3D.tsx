/**
 * ParticleText3D - 3D Particle Text Effect
 *
 * Displays text formed by 3D particles in the scene. Positioned in front of
 * the camera in a safe zone that won't overlap with the main scene elements
 * (EarthGlobe at Y=0, ParticleSwarm orbiting at radius 2.5-6.0).
 *
 * Features:
 * - Canvas-based text sampling to particle positions
 * - Instanced rendering for performance
 * - Breathing-synchronized fade in/out animations
 * - Organic floating motion for dreamy effect
 * - Positioned at Z=7 (between camera at Z=10 and scene at Z=0)
 *
 * Integration:
 * - Uses breathing phase from ECS traits for opacity animation
 * - Receives text from props (connected to inspirational text store in parent)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';
import { getTextAspectRatio, sampleTextToParticles } from './textSampler';

// Constants for particle text appearance
const PARTICLE_SIZE = 0.025; // Size of each particle dot
const TEXT_SCALE = 2.5; // Overall text scale in 3D world units
// Camera at Z=10, scene at Z=0. Position text at Z=7 (between camera and scene)
const TEXT_Z_POSITION = 7;
const TOP_TEXT_Y = 2.5; // Y position for top text (above scene)
const BOTTOM_TEXT_Y = -2.5; // Y position for bottom text (below scene)

// Sampling options for text-to-particle conversion
const SAMPLE_OPTIONS = {
  fontSize: 72,
  fontFamily: "'Cormorant Garamond', Georgia, serif", // Matches loaded Google Font
  fontWeight: '400',
  sampleSpacing: 2,
  maxParticles: 1500,
  padding: 16,
};

// Animation constants
const AMBIENT_SPEED = 0.3; // Speed of floating motion
const AMBIENT_AMPLITUDE = 0.02; // Amplitude of floating motion
const PARTICLE_SCATTER_RANGE = 0.15; // How far particles scatter during transitions

// Reusable objects for animation loop
const _tempObject = new THREE.Object3D();

export interface ParticleText3DProps {
  /** Top line of text */
  topText?: string;
  /** Bottom line of text */
  bottomText?: string;
  /** Particle color @default '#fffef7' (warm white) */
  particleColor?: string;
  /** Enable debug mode (shows bounding box) @default false */
  debug?: boolean;
}

interface TextLineState {
  instancedMesh: THREE.InstancedMesh | null;
  particlePositions: Array<{ x: number; y: number }>;
  baseY: number;
  aspectRatio: number;
  text: string;
}

/**
 * Calculate opacity based on breathing phase (same logic as InspirationalText)
 * - Phase 0 (Inhale): Fade in
 * - Phase 1 (Hold-in): Fully visible
 * - Phase 2 (Exhale): Fade out
 * - Phase 3 (Hold-out): Hidden
 */
function calculateOpacity(phaseIndex: number, breathValue: number): number {
  switch (phaseIndex) {
    case 0: {
      // Inhale - fade in with delayed reveal
      // Delayed reveal curve: stay low longer, then catch up
      const t = Math.max(0, Math.min(1, breathValue));
      return t ** 0.7; // Slightly delayed reveal
    }
    case 1: // Hold-in - fully visible
      return 1;
    case 2: // Exhale - fade out
      return 1 - breathValue ** 0.5; // Faster initial fade
    case 3: // Hold-out - hidden
      return 0;
    default:
      return 0;
  }
}

/**
 * Create particle geometry (small sphere for soft appearance)
 */
function createParticleGeometry(): THREE.SphereGeometry {
  return new THREE.SphereGeometry(PARTICLE_SIZE, 6, 6);
}

/**
 * Create particle material
 */
function createParticleMaterial(color: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 1,
    depthWrite: false, // Allows proper blending
  });
}

function ParticleText3DComponent({
  topText = '',
  bottomText = '',
  particleColor = '#fffef7',
  debug = false,
}: ParticleText3DProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);

  // Track text line states
  const topLineRef = useRef<TextLineState>({
    instancedMesh: null,
    particlePositions: [],
    baseY: TOP_TEXT_Y,
    aspectRatio: 1,
    text: '',
  });

  const bottomLineRef = useRef<TextLineState>({
    instancedMesh: null,
    particlePositions: [],
    baseY: BOTTOM_TEXT_Y,
    aspectRatio: 1,
    text: '',
  });

  // Current opacity (animated via RAF)
  const opacityRef = useRef(0);
  const targetOpacityRef = useRef(0);

  // Shared geometry and material
  const geometry = useMemo(() => createParticleGeometry(), []);
  const material = useMemo(() => createParticleMaterial(particleColor), [particleColor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Update instanced meshes when text changes
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Helper to update a text line
    const updateLine = (
      lineRef: React.MutableRefObject<TextLineState>,
      text: string,
      baseY: number,
    ) => {
      // Remove old mesh if text changed
      if (lineRef.current.instancedMesh && lineRef.current.text !== text) {
        group.remove(lineRef.current.instancedMesh);
        lineRef.current.instancedMesh.dispose();
        lineRef.current.instancedMesh = null;
      }

      // Skip if no text
      if (!text || text.trim() === '') {
        lineRef.current.particlePositions = [];
        lineRef.current.text = '';
        return;
      }

      // Skip if text hasn't changed
      if (lineRef.current.text === text && lineRef.current.instancedMesh) {
        return;
      }

      // Sample new text to particles
      const positions = sampleTextToParticles(text, SAMPLE_OPTIONS);
      const aspectRatio = getTextAspectRatio(text, SAMPLE_OPTIONS);

      // Create new instanced mesh
      const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
      instancedMesh.frustumCulled = false;

      // Set initial positions (will be updated in animation loop)
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const scaleX = TEXT_SCALE * aspectRatio;
        const scaleY = TEXT_SCALE;

        _tempObject.position.set(pos.x * scaleX, baseY + pos.y * scaleY, TEXT_Z_POSITION);
        _tempObject.scale.setScalar(1);
        _tempObject.updateMatrix();
        instancedMesh.setMatrixAt(i, _tempObject.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      group.add(instancedMesh);

      // Update ref
      lineRef.current = {
        instancedMesh,
        particlePositions: positions,
        baseY,
        aspectRatio,
        text,
      };
    };

    updateLine(topLineRef, topText, TOP_TEXT_Y);
    updateLine(bottomLineRef, bottomText, BOTTOM_TEXT_Y);
  }, [topText, bottomText, geometry, material]);

  // Animation loop - breathing sync and ambient motion
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    let currentPhaseIndex = 0;
    let currentBreathValue = 0;
    const breathEntity = world.queryFirst(breathPhase, phaseType);
    if (breathEntity) {
      currentBreathValue = breathEntity.get(breathPhase)?.value ?? 0;
      currentPhaseIndex = breathEntity.get(phaseType)?.value ?? 0;
    }

    // Calculate target opacity based on breathing phase
    targetOpacityRef.current = calculateOpacity(currentPhaseIndex, currentBreathValue);

    // Smooth opacity transition
    const opacityLerpSpeed = 8;
    opacityRef.current +=
      (targetOpacityRef.current - opacityRef.current) *
      Math.min(1, opacityLerpSpeed * state.clock.getDelta());

    const opacity = opacityRef.current;

    // Update material opacity
    material.opacity = opacity;

    // Update particle positions with ambient motion and scatter effect
    const updateParticles = (lineRef: React.MutableRefObject<TextLineState>) => {
      const { instancedMesh, particlePositions, baseY, aspectRatio } = lineRef.current;
      if (!instancedMesh || particlePositions.length === 0) return;

      const scaleX = TEXT_SCALE * aspectRatio;
      const scaleY = TEXT_SCALE;

      // Scatter factor - particles disperse when fading out
      const scatter = (1 - opacity) * PARTICLE_SCATTER_RANGE;

      for (let i = 0; i < particlePositions.length; i++) {
        const pos = particlePositions[i];

        // Base position
        const baseX = pos.x * scaleX;
        const baseYPos = baseY + pos.y * scaleY;

        // Ambient floating motion (unique per particle using golden ratio offset)
        const seed = i * 1.618033988749;
        const ambientX = Math.sin(time * AMBIENT_SPEED + seed) * AMBIENT_AMPLITUDE;
        const ambientY = Math.cos(time * AMBIENT_SPEED * 0.7 + seed * 0.5) * AMBIENT_AMPLITUDE;
        const ambientZ =
          Math.sin(time * AMBIENT_SPEED * 0.5 + seed * 1.3) * AMBIENT_AMPLITUDE * 0.5;

        // Scatter offset (when fading, particles drift outward from text center)
        const scatterX = pos.x * 2 * scatter * (0.5 + Math.sin(seed * 0.3) * 0.5);
        const scatterY = pos.y * 2 * scatter * (0.5 + Math.cos(seed * 0.7) * 0.5);
        const scatterZ = Math.sin(seed) * 0.5 * scatter;

        _tempObject.position.set(
          baseX + ambientX + scatterX,
          baseYPos + ambientY + scatterY,
          TEXT_Z_POSITION + ambientZ + scatterZ,
        );

        // Scale slightly with opacity for fade effect
        const scale = 0.8 + opacity * 0.4;
        _tempObject.scale.setScalar(scale);
        _tempObject.updateMatrix();
        instancedMesh.setMatrixAt(i, _tempObject.matrix);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
    };

    updateParticles(topLineRef);
    updateParticles(bottomLineRef);
  });

  return (
    <group ref={groupRef} name="ParticleText3D">
      {debug && (
        <>
          {/* Debug: Show text bounding areas */}
          <mesh position={[0, TOP_TEXT_Y, TEXT_Z_POSITION]}>
            <boxGeometry args={[TEXT_SCALE * 3, TEXT_SCALE * 0.5, 0.1]} />
            <meshBasicMaterial color="red" wireframe opacity={0.3} transparent />
          </mesh>
          <mesh position={[0, BOTTOM_TEXT_Y, TEXT_Z_POSITION]}>
            <boxGeometry args={[TEXT_SCALE * 3, TEXT_SCALE * 0.5, 0.1]} />
            <meshBasicMaterial color="blue" wireframe opacity={0.3} transparent />
          </mesh>
        </>
      )}
    </group>
  );
}

export const ParticleText3D = memo(ParticleText3DComponent);
export default ParticleText3D;
