/**
 * GeoMarkers - Country user count markers on the globe
 *
 * Renders floating holographic labels above countries showing the number
 * of connected users from each location. Uses drei's Html component
 * for billboard-style labels that always face the camera.
 *
 * IMPORTANT: This component must be rendered OUTSIDE the RefractionPipeline
 * to avoid being affected by depth-of-field blur post-processing.
 * Place it inside MomentumControls to follow globe rotation.
 *
 * Features:
 * - Positioned at country centroids on globe surface
 * - Billboard mode (always faces camera via sprite prop)
 * - Holographic/ethereal styling to match Monument Valley aesthetic
 * - Smooth scale animation with distance
 * - Auto-rotation synced with EarthGlobe for marker alignment
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';

import { COUNTRY_CENTROIDS, getCountryName, latLngToPosition } from '../../lib/countryCentroids';

/**
 * GeoMarkers component props
 */
interface GeoMarkersProps {
  /** User counts by country code */
  countryCounts: Record<string, number>;
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Offset above globe surface @default 0.3 */
  heightOffset?: number;
  /** Whether to show country names @default false */
  showNames?: boolean;
  /** Minimum user count to show marker @default 1 */
  minCount?: number;
  /** Maximum markers to show (to avoid clutter) @default 10 */
  maxMarkers?: number;
  /** Sync auto-rotation with EarthGlobe (same 0.0008 rad/frame) @default true */
  syncRotation?: boolean;
  /** Longitude offset in degrees for texture alignment @default 0 */
  longitudeOffset?: number;
}

/**
 * Single country marker component - Holographic style
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
      sprite
      distanceFactor={4}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(240,235,230,0.75) 100%)',
          borderRadius: '16px',
          border: '2px solid rgba(126,197,196,0.6)',
          boxShadow:
            '0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Country code/name */}
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#5a5a5a',
            textShadow: '0 1px 0 rgba(255,255,255,0.8)',
            letterSpacing: '0.8px',
          }}
        >
          {name}
        </span>

        {/* User count badge */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'white',
            background: 'linear-gradient(135deg, #7ec5c4 0%, #5eb3b2 100%)',
            padding: '4px 10px',
            borderRadius: '12px',
            boxShadow: '0 3px 8px rgba(94,179,178,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
            minWidth: '22px',
            textAlign: 'center',
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
 * Uses drei's Html component for HTML-over-WebGL rendering.
 *
 * PLACEMENT: Must be inside MomentumControls but OUTSIDE RefractionPipeline
 * to follow globe rotation without being affected by DoF blur.
 *
 * ROTATION SYNC: Matches EarthGlobe's auto-rotation (0.0008 rad/frame) so
 * markers stay aligned with their country positions on the texture.
 */
export function GeoMarkers({
  countryCounts,
  globeRadius = 1.5,
  heightOffset = 0.3,
  showNames = false,
  minCount = 1,
  maxMarkers = 10,
  syncRotation = true,
  longitudeOffset = 0,
}: GeoMarkersProps) {
  const groupRef = useRef<Group>(null);

  // Sync rotation with EarthGlobe's auto-rotation
  // EarthGlobe uses: rotation.y -= 0.0008 per frame
  useFrame(() => {
    if (!groupRef.current || !syncRotation) return;
    groupRef.current.rotation.y -= 0.0008;
  });

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
      // Apply longitude offset for texture alignment calibration
      const markerRadius = globeRadius + heightOffset;
      const position = latLngToPosition(centroid.lat, centroid.lng + longitudeOffset, markerRadius);

      result.push({ code, count, position });
    }

    // Sort by count descending and limit to maxMarkers to avoid visual clutter
    result.sort((a, b) => b.count - a.count);
    return result.slice(0, maxMarkers);
  }, [countryCounts, globeRadius, heightOffset, minCount, maxMarkers, longitudeOffset]);

  if (markers.length === 0) return null;

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
