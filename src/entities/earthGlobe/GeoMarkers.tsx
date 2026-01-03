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
 */

import { Html } from '@react-three/drei';
import { useMemo } from 'react';

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
      distanceFactor={5}
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
          gap: '6px',
          padding: '5px 10px',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Country code/name */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.95)',
            textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            letterSpacing: '0.5px',
          }}
        >
          {name}
        </span>

        {/* User count badge */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'white',
            background: 'linear-gradient(135deg, #7ec5c4 0%, #5eb3b2 100%)',
            padding: '3px 8px',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(94,179,178,0.4)',
            minWidth: '18px',
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
 */
export function GeoMarkers({
  countryCounts,
  globeRadius = 1.5,
  heightOffset = 0.3,
  showNames = false,
  minCount = 1,
  maxMarkers = 10,
}: GeoMarkersProps) {
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

    // Sort by count descending and limit to maxMarkers to avoid visual clutter
    result.sort((a, b) => b.count - a.count);
    return result.slice(0, maxMarkers);
  }, [countryCounts, globeRadius, heightOffset, minCount, maxMarkers]);

  if (markers.length === 0) return null;

  return (
    <group name="Geo Markers">
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
