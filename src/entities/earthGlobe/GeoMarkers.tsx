/**
 * GeoMarkers - Country user count markers on the globe
 *
 * Renders floating HTML labels above countries showing the number
 * of connected users from each location. Uses drei's Html component
 * for billboard-style labels that always face the camera.
 *
 * Features:
 * - Positioned at country centroids on globe surface
 * - Billboard mode (always faces camera)
 * - Occlusion support (hides behind globe)
 * - Smooth animation on count changes
 * - Monument Valley inspired styling
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type * as THREE from 'three';

import { COUNTRY_CENTROIDS, getCountryName, latLngToPosition } from '../../lib/countryCentroids';

/**
 * GeoMarkers component props
 */
interface GeoMarkersProps {
  /** User counts by country code */
  countryCounts: Record<string, number>;
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Offset above globe surface @default 0.15 */
  heightOffset?: number;
  /** Whether to show country names @default false */
  showNames?: boolean;
  /** Minimum user count to show marker @default 1 */
  minCount?: number;
  /** Reference to globe group for rotation sync */
  globeGroupRef?: React.RefObject<THREE.Group | null>;
}

/**
 * Individual marker label styling
 */
const markerStyle: React.CSSProperties = {
  padding: '4px 8px',
  backgroundColor: 'rgba(255, 255, 255, 0.85)',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 600,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#5a4a3a',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  userSelect: 'none',
  transition: 'opacity 0.3s ease',
};

/**
 * Single country marker component
 */
interface CountryMarkerProps {
  countryCode: string;
  count: number;
  position: [number, number, number];
  showName: boolean;
}

function CountryMarker({ countryCode, count, position, showName }: CountryMarkerProps) {
  const name = showName ? getCountryName(countryCode) : countryCode;

  return (
    <Html
      position={position}
      center
      distanceFactor={8}
      occlude="blending"
      style={{
        opacity: 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={markerStyle}>
        <span style={{ marginRight: '4px' }}>{name}</span>
        <span
          style={{
            backgroundColor: '#7ec5c4',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      </div>
    </Html>
  );
}

/**
 * GeoMarkers - Renders user count markers for each country
 *
 * Markers are positioned at country centroids, slightly above the globe surface.
 * Uses drei's Html component for HTML-over-WebGL rendering with occlusion.
 */
export function GeoMarkers({
  countryCounts,
  globeRadius = 1.5,
  heightOffset = 0.2,
  showNames = false,
  minCount = 1,
  globeGroupRef,
}: GeoMarkersProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate marker positions from country codes
  const markers = useMemo(() => {
    const result: Array<{
      code: string;
      count: number;
      position: [number, number, number];
    }> = [];

    for (const [code, count] of Object.entries(countryCounts)) {
      if (count < minCount) continue;

      const centroid = COUNTRY_CENTROIDS[code];
      if (!centroid) continue;

      // Position marker at country centroid, elevated above surface
      const markerRadius = globeRadius + heightOffset;
      const position = latLngToPosition(centroid.lat, centroid.lng, markerRadius);

      result.push({ code, count, position });
    }

    // Sort by count descending (most users on top in case of overlap)
    result.sort((a, b) => b.count - a.count);

    return result;
  }, [countryCounts, globeRadius, heightOffset, minCount]);

  // Sync rotation with globe
  useFrame(() => {
    if (groupRef.current && globeGroupRef?.current) {
      // Copy globe's rotation to markers group
      groupRef.current.rotation.copy(globeGroupRef.current.rotation);
    }
  });

  return (
    <group ref={groupRef} name="Geo Markers">
      {markers.map((marker) => (
        <CountryMarker
          key={marker.code}
          countryCode={marker.code}
          count={marker.count}
          position={marker.position}
          showName={showNames}
        />
      ))}
    </group>
  );
}

export default GeoMarkers;
