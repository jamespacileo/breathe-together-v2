/**
 * InspirationRibbon - 3D orbital text ring around the EarthGlobe
 *
 * Features:
 * - Text orbits the globe in a tilted ring formation
 * - Breathing-synced opacity (fades in during inhale, out during exhale)
 * - Subtle rotation animation for ethereal floating effect
 * - Uses drei's Text component (SDF rendering for crisp text at any distance)
 * - Flat ribbon band backing for clean aesthetic
 *
 * Visual style: Monument Valley inspired - soft, ethereal, pastel aesthetic
 * Similar to the PMNDRS carousel banner but adapted for breathing meditation
 */

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { useInspirationText } from '../../hooks/useInspirationText';
import { breathPhase, phaseType } from '../breath/traits';

/**
 * Calculate opacity based on breathing phase
 * Matches InspirationalText.tsx behavior for consistency
 */
function calculateOpacity(phase: number, phaseIdx: number): number {
  switch (phaseIdx) {
    case 0: // Inhale - fade in
      return phase;
    case 1: // Hold-in - fully visible
      return 1;
    case 2: // Exhale - fade out
      return 1 - phase;
    case 3: // Hold-out - hidden
      return 0;
    default:
      return 0;
  }
}

/**
 * Configuration for the ribbon
 */
const RIBBON_CONFIG = {
  // Positioning
  radius: 2.6, // Distance from center (outside globe's atmosphere)
  tilt: Math.PI * 0.08, // Subtle tilt for visual interest
  height: 0, // Vertical offset from center

  // Text styling
  fontSize: 0.22,
  letterSpacing: 0.12,
  fontColor: '#f8f4f0', // Warm white

  // Ribbon backing (flat band)
  ribbonWidth: 0.4, // Height of the band
  ribbonOpacity: 0.12,
  ribbonColor: '#c8b8a8', // Warm taupe

  // Animation
  rotationSpeed: 0.008, // Slow rotation
  breathScale: 0.06, // Scale change with breathing (6%)
};

// Pre-allocated color for ribbon material
const RIBBON_COLOR = new THREE.Color(RIBBON_CONFIG.ribbonColor);

interface InspirationRibbonProps {
  /** Radius of the orbital ring @default 2.6 */
  radius?: number;
  /** Font size for text @default 0.22 */
  fontSize?: number;
  /** Show the frosted glass backing ribbon @default true */
  showBacking?: boolean;
  /** Enable slow rotation animation @default true */
  enableRotation?: boolean;
  /** Vertical position offset @default 0 */
  verticalOffset?: number;
}

/**
 * Create a flat cylindrical band geometry (like a ribbon wrapped around)
 */
function createRibbonGeometry(
  radius: number,
  height: number,
  segments = 64,
): THREE.CylinderGeometry {
  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded)
  return new THREE.CylinderGeometry(radius, radius, height, segments, 1, true);
}

/**
 * InspirationRibbon - Renders inspirational text in a 3D orbital ring
 */
export function InspirationRibbon({
  radius = RIBBON_CONFIG.radius,
  fontSize = RIBBON_CONFIG.fontSize,
  showBacking = true,
  enableRotation = true,
  verticalOffset = RIBBON_CONFIG.height,
}: InspirationRibbonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const textRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ribbonRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Get inspiration message from hook
  const { message } = useInspirationText();

  // Create flat ribbon geometry (open cylinder)
  const ribbonGeometry = useMemo(() => {
    return createRibbonGeometry(radius, RIBBON_CONFIG.ribbonWidth);
  }, [radius]);

  // Create frosted glass material for ribbon
  const ribbonMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: RIBBON_COLOR,
        transparent: true,
        opacity: RIBBON_CONFIG.ribbonOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      ribbonGeometry.dispose();
    };
  }, [ribbonGeometry]);

  // Cleanup materials using helper hook
  useDisposeMaterials([ribbonMaterial]);

  /**
   * Animation loop - sync with breathing and rotate
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation loop requires multiple conditional updates for text opacity, ribbon opacity, scale, and rotation - splitting would reduce readability
  useFrame(() => {
    if (!groupRef.current) return;

    try {
      // Get breath state from ECS
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;
        const phaseIdx = breathEntity.get(phaseType)?.value ?? 0;

        // Calculate opacity based on phase
        const opacity = calculateOpacity(phase, phaseIdx);

        // Update all text opacities
        for (const textRef of textRefs.current) {
          if (textRef) {
            const material = textRef.material as THREE.MeshBasicMaterial;
            if (material && 'opacity' in material) {
              material.opacity = opacity;
            }
          }
        }

        // Update ribbon opacity
        if (ribbonRef.current) {
          ribbonMaterial.opacity = RIBBON_CONFIG.ribbonOpacity * opacity;
        }

        // Scale with breathing
        const scale = 1.0 + phase * RIBBON_CONFIG.breathScale;
        groupRef.current.scale.set(scale, scale, scale);
      }

      // Slow rotation for ethereal effect
      if (enableRotation) {
        groupRef.current.rotation.y += RIBBON_CONFIG.rotationSpeed * 0.016; // Normalize to ~60fps
      }
    } catch {
      // Silently catch ECS errors during unmount/remount in Triplex
    }
  });

  // Format message text - combine top and bottom with separator
  const fullText = message ? `${message.top}  ·  ${message.bottom}`.toUpperCase() : '';

  // Calculate text positions around the ring (4 positions for visibility from all angles)
  // Using fixed cardinal directions for stable keys
  const textPositions = useMemo(() => {
    const cardinals = ['north', 'east', 'south', 'west'] as const;
    const count = cardinals.length;

    return cardinals.map((direction, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
        key: direction,
        pos: new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius),
        rot: new THREE.Euler(0, angle + Math.PI, 0), // Face outward
      };
    });
  }, [radius]);

  return (
    <group
      ref={groupRef}
      rotation={[RIBBON_CONFIG.tilt, 0, 0]}
      position={[0, verticalOffset, 0]}
      name="Inspiration Ribbon"
    >
      {/* Flat ribbon backing (open cylinder) */}
      {showBacking && <mesh ref={ribbonRef} geometry={ribbonGeometry} material={ribbonMaterial} />}

      {/* Text positioned at 4 points around the ring */}
      {fullText &&
        textPositions.map((item, index) => (
          <Text
            key={`ribbon-text-${item.key}`}
            ref={(el) => {
              textRefs.current[index] = el;
            }}
            position={item.pos}
            rotation={item.rot}
            fontSize={fontSize}
            letterSpacing={RIBBON_CONFIG.letterSpacing}
            color={RIBBON_CONFIG.fontColor}
            anchorX="center"
            anchorY="middle"
            material-transparent={true}
            material-opacity={0}
            material-depthWrite={false}
            outlineWidth={0.006}
            outlineColor="#1a1815"
            maxWidth={radius * 1.2}
            textAlign="center"
          >
            {fullText}
          </Text>
        ))}
    </group>
  );
}

export default InspirationRibbon;
