/**
 * GeoMarkers - Country user count markers for the globe
 *
 * Renders floating count badges above countries with active users.
 * Uses Billboard sprites for always-facing-camera behavior.
 *
 * Visual style: Subtle, pastel aesthetic matching Monument Valley palette
 */

import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { getCountryCentroid, latLngToPosition } from '../../lib/countryCentroids';

interface GeoMarkersProps {
  /** Country counts object (ISO code -> count) */
  countries: Record<string, number>;
  /** Globe radius to position markers above surface @default 1.5 */
  globeRadius?: number;
  /** Height above globe surface @default 0.15 */
  markerHeight?: number;
  /** Minimum count to show marker @default 1 */
  minCount?: number;
  /** Maximum markers to display @default 20 */
  maxMarkers?: number;
  /** Text color @default '#5a4d42' */
  textColor?: string;
  /** Badge background color @default '#f5f0eb' */
  badgeColor?: string;
  /** Enable breathing animation @default true */
  breatheAnimation?: boolean;
  /** Current breath phase (0-1) for animation */
  breathPhase?: number;
}

interface MarkerData {
  code: string;
  name: string;
  count: number;
  position: [number, number, number];
}

/**
 * Prepare marker data from country counts
 */
function prepareMarkers(
  countries: Record<string, number>,
  globeRadius: number,
  markerHeight: number,
  minCount: number,
  maxMarkers: number,
): MarkerData[] {
  const markers: MarkerData[] = [];

  // Sort by count descending
  const sortedEntries = Object.entries(countries)
    .filter(([, count]) => count >= minCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxMarkers);

  for (const [code, count] of sortedEntries) {
    const centroid = getCountryCentroid(code);
    if (!centroid) continue;

    const position = latLngToPosition(centroid.lat, centroid.lng, globeRadius + markerHeight);

    markers.push({
      code,
      name: centroid.name,
      count,
      position,
    });
  }

  return markers;
}

/**
 * Single country marker with count badge
 */
function CountryMarker({
  marker,
  textColor,
  badgeColor,
  breathPhase,
  breatheAnimation,
}: {
  marker: MarkerData;
  textColor: string;
  badgeColor: string;
  breathPhase: number;
  breatheAnimation: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Gentle breathing animation
  useFrame(() => {
    if (!groupRef.current || !breatheAnimation) return;

    // Subtle scale pulse (1.0 to 1.08)
    const scale = 1.0 + breathPhase * 0.08;
    groupRef.current.scale.setScalar(scale);

    // Gentle bob (small Y offset)
    groupRef.current.position.y = breathPhase * 0.02;
  });

  // Format count for display
  const displayCount =
    marker.count >= 1000 ? `${(marker.count / 1000).toFixed(1)}k` : marker.count.toString();

  return (
    <group position={marker.position}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <group ref={groupRef}>
          {/* Background circle */}
          <mesh>
            <circleGeometry args={[0.08, 24]} />
            <meshBasicMaterial
              color={badgeColor}
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Count text */}
          <Text
            fontSize={0.05}
            color={textColor}
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.001]}
            font="/fonts/Inter-Medium.woff"
            outlineWidth={0.002}
            outlineColor="#ffffff"
          >
            {displayCount}
          </Text>

          {/* Country code label (below) */}
          <Text
            fontSize={0.025}
            color={textColor}
            anchorX="center"
            anchorY="top"
            position={[0, -0.06, 0.001]}
            font="/fonts/Inter-Medium.woff"
            outlineWidth={0.001}
            outlineColor="#ffffff"
            fillOpacity={0.7}
          >
            {marker.code}
          </Text>
        </group>
      </Billboard>
    </group>
  );
}

/**
 * GeoMarkers component - renders all country markers
 */
export function GeoMarkers({
  countries,
  globeRadius = 1.5,
  markerHeight = 0.15,
  minCount = 1,
  maxMarkers = 20,
  textColor = '#5a4d42',
  badgeColor = '#f5f0eb',
  breatheAnimation = true,
  breathPhase = 0,
}: GeoMarkersProps) {
  // Memoize marker preparation
  const markers = useMemo(
    () => prepareMarkers(countries, globeRadius, markerHeight, minCount, maxMarkers),
    [countries, globeRadius, markerHeight, minCount, maxMarkers],
  );

  if (markers.length === 0) return null;

  return (
    <group name="GeoMarkers">
      {markers.map((marker) => (
        <CountryMarker
          key={marker.code}
          marker={marker}
          textColor={textColor}
          badgeColor={badgeColor}
          breathPhase={breathPhase}
          breatheAnimation={breatheAnimation}
        />
      ))}
    </group>
  );
}

export default GeoMarkers;
