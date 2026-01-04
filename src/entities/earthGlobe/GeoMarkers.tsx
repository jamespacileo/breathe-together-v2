/**
 * GeoMarkers - Country user count markers on the globe (3D version)
 *
 * Renders floating holographic labels above countries showing the number
 * of connected users from each location. Uses drei's Billboard + Text
 * for true 3D integration with proper depth testing.
 *
 * KEY FEATURES:
 * - True 3D meshes that participate in depth buffer
 * - Occluded by objects in front (particle shards)
 * - Hidden when behind the globe
 * - Billboard behavior (always faces camera)
 * - Holographic Fresnel edge glow effect
 * - Auto-rotation synced with EarthGlobe
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 */

import { Billboard, RoundedBox, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { Color, DoubleSide } from 'three';
import {
  abs,
  add,
  cameraPosition,
  dot,
  Fn,
  mix,
  mul,
  normalize,
  positionWorld,
  pow,
  sin,
  sub,
  transformedNormalWorld,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

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
 * Single country marker component - 3D holographic style
 */
interface CountryMarkerProps {
  countryCode: string;
  count: number;
  position: [number, number, number];
  showName: boolean;
}

/**
 * Holographic material with Fresnel edge glow (TSL version)
 */
function HolographicMaterial({
  baseColor = '#ffffff',
  glowColor = '#7ec5c4',
}: {
  baseColor?: string;
  glowColor?: string;
}) {
  const materialRef = useRef<MeshBasicNodeMaterial>(null);

  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.transparent = true;
    mat.depthTest = true;
    mat.depthWrite = true;
    mat.side = DoubleSide;

    // Uniforms
    const timeUniform = uniform(0);
    const baseColorValue = new Color(baseColor);
    const glowColorValue = new Color(glowColor);
    const opacityValue = 0.85;
    const fresnelPower = 2.0;

    // Store time uniform for animation
    mat.userData.time = timeUniform;

    // Build color node using TSL
    const colorNode = Fn(() => {
      // Calculate view direction from camera to world position
      const normal = transformedNormalWorld;
      const viewDir = normalize(sub(cameraPosition, positionWorld));

      // Fresnel effect for edge glow
      const fresnel = pow(sub(1.0, abs(dot(normal, viewDir))), fresnelPower);

      // Subtle pulse animation
      const pulse = add(0.95, mul(0.05, sin(mul(timeUniform, 2.0))));

      // Mix base color with glow at edges
      const baseColorVec = vec3(baseColorValue.r, baseColorValue.g, baseColorValue.b);
      const glowColorVec = vec3(glowColorValue.r, glowColorValue.g, glowColorValue.b);
      const color = mix(baseColorVec, glowColorVec, mul(fresnel, 0.6));

      // Final opacity with fresnel boost at edges
      const alpha = add(mul(opacityValue, pulse), mul(fresnel, 0.15));

      return vec4(color, alpha);
    })();

    mat.colorNode = colorNode;

    return mat;
  }, [baseColor, glowColor]);

  useFrame((state) => {
    if (material.userData.time) {
      material.userData.time.value = state.clock.elapsedTime;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} ref={materialRef} attach="material" />;
}

/**
 * Badge background mesh - rounded rectangle with holographic effect
 */
function MarkerBadge({ width, height }: { width: number; height: number }) {
  return (
    <RoundedBox args={[width, height, 0.02]} radius={0.04} smoothness={4}>
      <HolographicMaterial baseColor="#f8f6f4" glowColor="#7ec5c4" />
    </RoundedBox>
  );
}

/**
 * Count badge - teal pill shape
 */
function CountBadge({ count, offsetX }: { count: number; offsetX: number }) {
  const countStr = String(count);
  const badgeWidth = 0.1 + countStr.length * 0.04;

  return (
    <group position={[offsetX, 0, 0.015]}>
      {/* Teal pill background */}
      <RoundedBox args={[badgeWidth, 0.085, 0.015]} radius={0.03} smoothness={4}>
        <meshBasicMaterial
          color="#5eb3b2"
          transparent
          opacity={0.95}
          depthTest={true}
          depthWrite={true}
        />
      </RoundedBox>
      {/* Count number */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.055}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
        depthOffset={-1}
      >
        {count}
      </Text>
    </group>
  );
}

function CountryMarker({ countryCode, count, position, showName }: CountryMarkerProps) {
  const name = showName ? getCountryName(countryCode) : countryCode;
  const meshRef = useRef<Mesh>(null);

  // Calculate dimensions based on text length
  const nameLength = name.length;
  const countLength = String(count).length;
  const countBadgeWidth = 0.1 + countLength * 0.04;
  const badgeWidth = 0.06 + nameLength * 0.025 + countBadgeWidth + 0.04;
  const badgeHeight = 0.12;

  // Position offsets for text elements
  const nameOffsetX = -badgeWidth / 2 + 0.04 + (nameLength * 0.025) / 2;
  const countOffsetX = badgeWidth / 2 - 0.04 - countBadgeWidth / 2;

  return (
    <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={position}>
      <group ref={meshRef}>
        {/* Main badge background */}
        <MarkerBadge width={badgeWidth} height={badgeHeight} />

        {/* Country code/name text */}
        <Text
          position={[nameOffsetX, 0, 0.015]}
          fontSize={0.038}
          color="#5a5a5a"
          anchorX="center"
          anchorY="middle"
          fontWeight={600}
          letterSpacing={0.05}
          depthOffset={-1}
        >
          {name}
        </Text>

        {/* Count badge */}
        <CountBadge count={count} offsetX={countOffsetX} />
      </group>
    </Billboard>
  );
}

/**
 * GeoMarkers - Renders user count markers for each country
 *
 * Markers are positioned at country centroids, slightly above the globe surface.
 * Uses drei's Billboard + Text for true 3D integration with depth testing.
 *
 * PLACEMENT: Can be placed inside or outside RefractionPipeline.
 * When inside, markers will have DoF blur applied (cinematic).
 * When outside, markers stay crisp (HUD-like).
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
    <group ref={groupRef} name="Geo Markers 3D">
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
