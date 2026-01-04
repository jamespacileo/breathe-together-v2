/**
 * Tests for Country Centroids and Geo Marker positioning
 *
 * These tests ensure the coordinate conversion and country positioning
 * work correctly to prevent regressions in the geo tracking feature.
 */

import { describe, expect, it } from 'vitest';
import {
  COUNTRY_CENTROIDS,
  getCountryName,
  getCountryPosition,
  latLngToPosition,
} from './countryCentroids';

describe('countryCentroids', () => {
  describe('latLngToPosition', () => {
    const RADIUS = 1.5;

    it('converts North Pole correctly (lat 90)', () => {
      const [x, y, z] = latLngToPosition(90, 0, RADIUS);
      // North pole should be at top of sphere (y = radius)
      expect(y).toBeCloseTo(RADIUS, 5);
      expect(x).toBeCloseTo(0, 5);
      expect(z).toBeCloseTo(0, 5);
    });

    it('converts South Pole correctly (lat -90)', () => {
      const [x, y, z] = latLngToPosition(-90, 0, RADIUS);
      // South pole should be at bottom of sphere (y = -radius)
      expect(y).toBeCloseTo(-RADIUS, 5);
      expect(x).toBeCloseTo(0, 5);
      expect(z).toBeCloseTo(0, 5);
    });

    it('converts equator positions correctly (lat 0)', () => {
      const [x, y, z] = latLngToPosition(0, 0, RADIUS);
      // Equator at lng 0 should have y = 0
      expect(y).toBeCloseTo(0, 5);
      // Position should be on sphere surface
      const distance = Math.sqrt(x * x + y * y + z * z);
      expect(distance).toBeCloseTo(RADIUS, 5);
    });

    it('produces points on sphere surface for any lat/lng', () => {
      const testCases = [
        { lat: 45, lng: 90 },
        { lat: -30, lng: -60 },
        { lat: 60, lng: 180 },
        { lat: -45, lng: -180 },
        { lat: 0, lng: 0 },
      ];

      for (const { lat, lng } of testCases) {
        const [x, y, z] = latLngToPosition(lat, lng, RADIUS);
        const distance = Math.sqrt(x * x + y * y + z * z);
        expect(distance).toBeCloseTo(RADIUS, 5);
      }
    });

    it('handles different radii correctly', () => {
      const radii = [1, 1.5, 2, 5, 10];

      for (const radius of radii) {
        const [x, y, z] = latLngToPosition(45, 45, radius);
        const distance = Math.sqrt(x * x + y * y + z * z);
        expect(distance).toBeCloseTo(radius, 5);
      }
    });

    it('produces correct relative positions for known locations', () => {
      // Northern hemisphere should have positive y
      const [, yUS] = latLngToPosition(39.8, -98.5, RADIUS);
      expect(yUS).toBeGreaterThan(0);

      // Southern hemisphere should have negative y
      const [, yAU] = latLngToPosition(-25.27, 133.77, RADIUS);
      expect(yAU).toBeLessThan(0);
    });

    it('places opposite longitudes on opposite sides', () => {
      const [x1] = latLngToPosition(0, 0, RADIUS);
      const [x2] = latLngToPosition(0, 180, RADIUS);

      // Points at opposite longitudes should be on opposite sides
      // x1 and x2 should have opposite signs (or one near zero)
      expect(x1 * x2).toBeLessThanOrEqual(0.01);
    });
  });

  describe('COUNTRY_CENTROIDS', () => {
    it('contains major countries', () => {
      const majorCountries = ['US', 'GB', 'DE', 'FR', 'JP', 'CN', 'AU', 'BR', 'IN', 'CA'];

      for (const code of majorCountries) {
        expect(COUNTRY_CENTROIDS[code]).toBeDefined();
        expect(COUNTRY_CENTROIDS[code].name).toBeTruthy();
      }
    });

    it('has valid latitude ranges (-90 to 90)', () => {
      for (const centroid of Object.values(COUNTRY_CENTROIDS)) {
        expect(centroid.lat).toBeGreaterThanOrEqual(-90);
        expect(centroid.lat).toBeLessThanOrEqual(90);
      }
    });

    it('has valid longitude ranges (-180 to 180)', () => {
      for (const centroid of Object.values(COUNTRY_CENTROIDS)) {
        expect(centroid.lng).toBeGreaterThanOrEqual(-180);
        expect(centroid.lng).toBeLessThanOrEqual(180);
      }
    });

    it('has non-empty names for all countries', () => {
      for (const centroid of Object.values(COUNTRY_CENTROIDS)) {
        expect(centroid.name).toBeTruthy();
        expect(centroid.name.length).toBeGreaterThan(0);
      }
    });

    it('places US in northern/western hemisphere', () => {
      const us = COUNTRY_CENTROIDS.US;
      expect(us.lat).toBeGreaterThan(0); // Northern
      expect(us.lng).toBeLessThan(0); // Western
    });

    it('places Australia in southern/eastern hemisphere', () => {
      const au = COUNTRY_CENTROIDS.AU;
      expect(au.lat).toBeLessThan(0); // Southern
      expect(au.lng).toBeGreaterThan(0); // Eastern
    });

    it('places Japan in northern/eastern hemisphere', () => {
      const jp = COUNTRY_CENTROIDS.JP;
      expect(jp.lat).toBeGreaterThan(0); // Northern
      expect(jp.lng).toBeGreaterThan(0); // Eastern
    });

    it('places Brazil in southern/western hemisphere', () => {
      const br = COUNTRY_CENTROIDS.BR;
      expect(br.lat).toBeLessThan(0); // Southern
      expect(br.lng).toBeLessThan(0); // Western
    });
  });

  describe('getCountryPosition', () => {
    const RADIUS = 1.5;

    it('returns position for known countries', () => {
      const position = getCountryPosition('US', RADIUS);
      expect(position).not.toBeNull();
      expect(position).toHaveLength(3);
    });

    it('returns null for unknown country codes', () => {
      expect(getCountryPosition('XX', RADIUS)).toBeNull();
      expect(getCountryPosition('INVALID', RADIUS)).toBeNull();
      expect(getCountryPosition('', RADIUS)).toBeNull();
    });

    it('returns positions on sphere surface', () => {
      const knownCountries = ['US', 'GB', 'JP', 'AU'];

      for (const code of knownCountries) {
        const position = getCountryPosition(code, RADIUS);
        expect(position).not.toBeNull();

        if (position) {
          const [x, y, z] = position;
          const distance = Math.sqrt(x * x + y * y + z * z);
          expect(distance).toBeCloseTo(RADIUS, 5);
        }
      }
    });

    it('returns different positions for different countries', () => {
      const usPos = getCountryPosition('US', RADIUS);
      const jpPos = getCountryPosition('JP', RADIUS);
      const auPos = getCountryPosition('AU', RADIUS);

      expect(usPos).not.toEqual(jpPos);
      expect(usPos).not.toEqual(auPos);
      expect(jpPos).not.toEqual(auPos);
    });
  });

  describe('getCountryName', () => {
    it('returns full name for known countries', () => {
      expect(getCountryName('US')).toBe('United States');
      expect(getCountryName('GB')).toBe('United Kingdom');
      expect(getCountryName('JP')).toBe('Japan');
      expect(getCountryName('AU')).toBe('Australia');
    });

    it('returns the code itself for unknown countries', () => {
      expect(getCountryName('XX')).toBe('XX');
      expect(getCountryName('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('marker positioning integration', () => {
    const GLOBE_RADIUS = 1.5;
    const HEIGHT_OFFSET = 0.3;

    it('markers are positioned above globe surface', () => {
      const markerRadius = GLOBE_RADIUS + HEIGHT_OFFSET;

      for (const code of ['US', 'GB', 'JP', 'AU', 'BR']) {
        const centroid = COUNTRY_CENTROIDS[code];
        const [x, y, z] = latLngToPosition(centroid.lat, centroid.lng, markerRadius);
        const distance = Math.sqrt(x * x + y * y + z * z);

        // Marker should be at markerRadius (above globe surface)
        expect(distance).toBeCloseTo(markerRadius, 5);
        expect(distance).toBeGreaterThan(GLOBE_RADIUS);
      }
    });

    it('markers maintain correct relative positions', () => {
      const markerRadius = GLOBE_RADIUS + HEIGHT_OFFSET;

      // US marker should be in upper half (positive y)
      const usPos = latLngToPosition(
        COUNTRY_CENTROIDS.US.lat,
        COUNTRY_CENTROIDS.US.lng,
        markerRadius,
      );
      expect(usPos[1]).toBeGreaterThan(0);

      // Australia marker should be in lower half (negative y)
      const auPos = latLngToPosition(
        COUNTRY_CENTROIDS.AU.lat,
        COUNTRY_CENTROIDS.AU.lng,
        markerRadius,
      );
      expect(auPos[1]).toBeLessThan(0);
    });

    it('all country markers are uniquely positioned', () => {
      const markerRadius = GLOBE_RADIUS + HEIGHT_OFFSET;
      const positions: Array<{ code: string; pos: [number, number, number] }> = [];

      for (const [code, centroid] of Object.entries(COUNTRY_CENTROIDS)) {
        const pos = latLngToPosition(centroid.lat, centroid.lng, markerRadius);
        positions.push({ code, pos });
      }

      // Check no two countries have identical positions
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const pos1 = positions[i].pos;
          const pos2 = positions[j].pos;

          const distance = Math.sqrt(
            (pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2 + (pos1[2] - pos2[2]) ** 2,
          );

          // Countries should be at least 0.01 units apart
          expect(distance).toBeGreaterThan(0.01);
        }
      }
    });
  });
});
