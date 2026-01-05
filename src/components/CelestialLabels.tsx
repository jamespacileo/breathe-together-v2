/**
 * CelestialLabels - Minimal UI overlay labels for celestial entities.
 *
 * Renders small, unobtrusive labels for Sun, Moon, and visible constellations
 * to help users orient themselves in the 3D environment. Uses Html from drei
 * to position labels in 3D space that render as DOM elements.
 *
 * Features:
 * - Real-time tracking of Sun/Moon positions (astronomical calculations)
 * - Constellation labels at centroid of visible constellation stars
 * - Minimal, semi-transparent styling that doesn't distract from meditation
 * - Cardinal direction labels (N, S, E, W) for orientation
 */

import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import {
  calculateGMST,
  calculateMoonPosition,
  calculateSunPosition,
  celestialToCartesian,
} from '../lib/astronomy';
import { CONSTELLATIONS, STARS } from '../lib/constellationData';

interface CelestialLabelsProps {
  /** Enable label rendering @default true */
  enabled?: boolean;
  /** Show sun label @default true */
  showSunLabel?: boolean;
  /** Show moon label @default true */
  showMoonLabel?: boolean;
  /** Show constellation labels @default true */
  showConstellationLabels?: boolean;
  /** Show cardinal direction labels @default true */
  showCardinalLabels?: boolean;
  /** Distance from center for celestial objects @default 28 */
  celestialRadius?: number;
  /** Distance from center for cardinal labels @default 15 */
  cardinalRadius?: number;
  /** Label opacity @default 0.7 */
  opacity?: number;
}

/**
 * Minimal label style - warm, subtle, readable
 */
const labelStyle: React.CSSProperties = {
  color: '#f5f0e8',
  fontSize: '11px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontWeight: 500,
  letterSpacing: '0.02em',
  textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(0,0,0,0.3)',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
};

/**
 * Style for celestial body labels (sun/moon)
 */
const celestialLabelStyle: React.CSSProperties = {
  ...labelStyle,
  fontSize: '12px',
  fontWeight: 600,
};

/**
 * Style for cardinal direction labels
 */
const cardinalLabelStyle: React.CSSProperties = {
  ...labelStyle,
  fontSize: '10px',
  fontWeight: 400,
  opacity: 0.6,
  letterSpacing: '0.05em',
};

/**
 * Single label component with Html wrapper
 */
function CelestialLabel({
  position,
  label,
  style,
  opacity,
  offsetY = 0,
}: {
  position: THREE.Vector3;
  label: string;
  style?: React.CSSProperties;
  opacity?: number;
  offsetY?: number;
}) {
  return (
    <Html
      position={[position.x, position.y + offsetY, position.z]}
      center
      style={{ opacity }}
      zIndexRange={[10, 0]}
    >
      <span style={style}>{label}</span>
    </Html>
  );
}

/**
 * Calculate centroid of a constellation from its star positions
 */
function getConstellationCentroid(
  constellationId: string,
  radius: number,
  gmst: number,
): THREE.Vector3 | null {
  const constellation = CONSTELLATIONS.find((c) => c.id === constellationId);
  if (!constellation) return null;

  const starPositions: THREE.Vector3[] = [];
  for (const starId of constellation.stars) {
    const star = STARS.find((s) => s.id === starId);
    if (star) {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, gmst);
      starPositions.push(new THREE.Vector3(x, y, z));
    }
  }

  if (starPositions.length === 0) return null;

  // Calculate centroid
  const centroid = new THREE.Vector3();
  for (const pos of starPositions) {
    centroid.add(pos);
  }
  centroid.divideScalar(starPositions.length);

  return centroid;
}

/**
 * Subset of constellations to show labels for (most recognizable)
 */
const LABELED_CONSTELLATIONS = [
  'ori', // Orion
  'uma', // Big Dipper
  'cas', // Cassiopeia
  'cyg', // Cygnus (Northern Cross)
  'sco', // Scorpius
  'leo', // Leo
];

export const CelestialLabels = memo(function CelestialLabels({
  enabled = true,
  showSunLabel = true,
  showMoonLabel = true,
  showConstellationLabels = true,
  showCardinalLabels = true,
  celestialRadius = 28,
  cardinalRadius = 15,
  opacity = 0.7,
}: CelestialLabelsProps) {
  const { camera } = useThree();

  // Positions state - updated periodically
  const [sunPosition, setSunPosition] = useState<THREE.Vector3 | null>(null);
  const [moonPosition, setMoonPosition] = useState<THREE.Vector3 | null>(null);
  const [constellationPositions, setConstellationPositions] = useState<Map<string, THREE.Vector3>>(
    new Map(),
  );

  // Track last update time for throttling
  const lastUpdateRef = useRef(0);
  const UPDATE_INTERVAL = 5; // Update every 5 seconds

  // Cardinal direction positions (fixed in world space)
  const cardinalPositions = useMemo(() => {
    const r = cardinalRadius;
    return {
      N: new THREE.Vector3(0, 0, -r),
      S: new THREE.Vector3(0, 0, r),
      E: new THREE.Vector3(r, 0, 0),
      W: new THREE.Vector3(-r, 0, 0),
    };
  }, [cardinalRadius]);

  // Update positions periodically
  useFrame((state) => {
    if (!enabled) return;

    const currentTime = state.clock.elapsedTime;
    if (currentTime - lastUpdateRef.current < UPDATE_INTERVAL) return;
    lastUpdateRef.current = currentTime;

    const now = new Date();
    const gmst = calculateGMST(now);

    // Update sun position
    if (showSunLabel) {
      const sunData = calculateSunPosition(now);
      const [x, y, z] = celestialToCartesian(sunData.ra, sunData.dec, celestialRadius, gmst);
      setSunPosition(new THREE.Vector3(x, y, z));
    }

    // Update moon position
    if (showMoonLabel) {
      const moonData = calculateMoonPosition(now);
      const [x, y, z] = celestialToCartesian(moonData.ra, moonData.dec, celestialRadius - 4, gmst);
      setMoonPosition(new THREE.Vector3(x, y, z));
    }

    // Update constellation positions
    if (showConstellationLabels) {
      const newPositions = new Map<string, THREE.Vector3>();
      for (const constId of LABELED_CONSTELLATIONS) {
        const centroid = getConstellationCentroid(constId, celestialRadius - 3, gmst);
        if (centroid) {
          newPositions.set(constId, centroid);
        }
      }
      setConstellationPositions(newPositions);
    }
  });

  // Initial calculation
  useMemo(() => {
    const now = new Date();
    const gmst = calculateGMST(now);

    if (showSunLabel) {
      const sunData = calculateSunPosition(now);
      const [x, y, z] = celestialToCartesian(sunData.ra, sunData.dec, celestialRadius, gmst);
      setSunPosition(new THREE.Vector3(x, y, z));
    }

    if (showMoonLabel) {
      const moonData = calculateMoonPosition(now);
      const [x, y, z] = celestialToCartesian(moonData.ra, moonData.dec, celestialRadius - 4, gmst);
      setMoonPosition(new THREE.Vector3(x, y, z));
    }

    if (showConstellationLabels) {
      const newPositions = new Map<string, THREE.Vector3>();
      for (const constId of LABELED_CONSTELLATIONS) {
        const centroid = getConstellationCentroid(constId, celestialRadius - 3, gmst);
        if (centroid) {
          newPositions.set(constId, centroid);
        }
      }
      setConstellationPositions(newPositions);
    }
  }, [celestialRadius, showSunLabel, showMoonLabel, showConstellationLabels]);

  // Check if a position is visible from camera perspective (roughly in front)
  const isVisibleFromCamera = (position: THREE.Vector3): boolean => {
    const toPosition = position.clone().sub(camera.position).normalize();
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const dot = toPosition.dot(cameraDir);
    return dot > -0.3; // Allow some peripheral visibility
  };

  if (!enabled) return null;

  return (
    <group>
      {/* Sun label */}
      {showSunLabel && sunPosition && isVisibleFromCamera(sunPosition) && (
        <CelestialLabel
          position={sunPosition}
          label="Sun"
          style={celestialLabelStyle}
          opacity={opacity}
          offsetY={2}
        />
      )}

      {/* Moon label */}
      {showMoonLabel && moonPosition && isVisibleFromCamera(moonPosition) && (
        <CelestialLabel
          position={moonPosition}
          label="Moon"
          style={celestialLabelStyle}
          opacity={opacity}
          offsetY={1.5}
        />
      )}

      {/* Constellation labels */}
      {showConstellationLabels &&
        Array.from(constellationPositions.entries()).map(([constId, position]) => {
          if (!isVisibleFromCamera(position)) return null;

          const constellation = CONSTELLATIONS.find((c) => c.id === constId);
          if (!constellation) return null;

          return (
            <CelestialLabel
              key={constId}
              position={position}
              label={constellation.name}
              style={labelStyle}
              opacity={opacity * 0.8}
              offsetY={1}
            />
          );
        })}

      {/* Cardinal direction labels */}
      {showCardinalLabels && (
        <>
          <CelestialLabel
            position={cardinalPositions.N}
            label="N"
            style={cardinalLabelStyle}
            opacity={opacity * 0.6}
          />
          <CelestialLabel
            position={cardinalPositions.S}
            label="S"
            style={cardinalLabelStyle}
            opacity={opacity * 0.6}
          />
          <CelestialLabel
            position={cardinalPositions.E}
            label="E"
            style={cardinalLabelStyle}
            opacity={opacity * 0.6}
          />
          <CelestialLabel
            position={cardinalPositions.W}
            label="W"
            style={cardinalLabelStyle}
            opacity={opacity * 0.6}
          />
        </>
      )}
    </group>
  );
});
