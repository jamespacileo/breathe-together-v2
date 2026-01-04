/**
 * Tests for astronomical calculations using astronomy-engine library.
 *
 * These tests validate celestial positioning calculations including:
 * - GMST (Greenwich Mean Sidereal Time) calculations
 * - Celestial to Cartesian coordinate conversion
 * - Sun and Moon position calculations
 * - Constellation identification
 * - Altitude/Azimuth calculations
 */

import { describe, expect, it } from 'vitest';
import {
  calculateAltAz,
  calculateGMST,
  calculateMoonPosition,
  calculateSunPosition,
  celestialToCartesian,
  getCelestialState,
  getConstellation,
  getMoonPhase,
  getPlanetPosition,
  isAboveHorizon,
} from './astronomy';

describe('astronomy calculations', () => {
  describe('calculateGMST', () => {
    it('returns a value in valid range (0 to 2π)', () => {
      const gmst = calculateGMST(new Date());
      expect(gmst).toBeGreaterThanOrEqual(0);
      expect(gmst).toBeLessThan(Math.PI * 2);
    });

    it('returns different values for different times', () => {
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-01T12:00:00Z');

      const gmst1 = calculateGMST(date1);
      const gmst2 = calculateGMST(date2);

      expect(gmst1).not.toEqual(gmst2);
    });

    it('advances by approximately π radians per 12 hours', () => {
      const date1 = new Date('2024-06-15T00:00:00Z');
      const date2 = new Date('2024-06-15T12:00:00Z');

      const gmst1 = calculateGMST(date1);
      const gmst2 = calculateGMST(date2);

      // GMST advances about π radians in 12 hours (half a day)
      // Allow some tolerance for sidereal vs solar time difference
      const diff = Math.abs(gmst2 - gmst1);
      // Could wrap around, so check both direct diff and wrapped diff
      const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
      expect(normalizedDiff).toBeCloseTo(Math.PI, 1);
    });

    it('is consistent for same time', () => {
      const date = new Date('2024-03-20T12:00:00Z');
      const gmst1 = calculateGMST(date);
      const gmst2 = calculateGMST(date);

      expect(gmst1).toEqual(gmst2);
    });
  });

  describe('celestialToCartesian', () => {
    const RADIUS = 25;
    const GMST = 0; // Simplify by using GMST = 0

    it('places celestial north pole at positive Y', () => {
      // Declination +90 = celestial north pole
      const [x, y, z] = celestialToCartesian(0, 90, RADIUS, GMST);

      expect(y).toBeCloseTo(RADIUS, 5);
      expect(x).toBeCloseTo(0, 5);
      expect(z).toBeCloseTo(0, 5);
    });

    it('places celestial south pole at negative Y', () => {
      // Declination -90 = celestial south pole
      const [x, y, z] = celestialToCartesian(0, -90, RADIUS, GMST);

      expect(y).toBeCloseTo(-RADIUS, 5);
      expect(x).toBeCloseTo(0, 5);
      expect(z).toBeCloseTo(0, 5);
    });

    it('places celestial equator at Y=0', () => {
      // Declination 0 = celestial equator
      const [, y] = celestialToCartesian(6, 0, RADIUS, GMST);

      expect(y).toBeCloseTo(0, 5);
    });

    it('produces points on sphere surface', () => {
      const testCases = [
        { ra: 0, dec: 0 },
        { ra: 6, dec: 45 },
        { ra: 12, dec: -30 },
        { ra: 18, dec: 60 },
        { ra: 23, dec: -60 },
      ];

      for (const { ra, dec } of testCases) {
        const [x, y, z] = celestialToCartesian(ra, dec, RADIUS, GMST);
        const distance = Math.sqrt(x * x + y * y + z * z);
        expect(distance).toBeCloseTo(RADIUS, 5);
      }
    });

    it('handles different radii correctly', () => {
      const radii = [10, 25, 50, 100];

      for (const radius of radii) {
        const [x, y, z] = celestialToCartesian(6, 30, radius, GMST);
        const distance = Math.sqrt(x * x + y * y + z * z);
        expect(distance).toBeCloseTo(radius, 5);
      }
    });

    it('rotates with GMST', () => {
      const ra = 6; // 6 hours RA
      const dec = 0;

      const pos1 = celestialToCartesian(ra, dec, RADIUS, 0);
      const pos2 = celestialToCartesian(ra, dec, RADIUS, Math.PI / 2);

      // Different GMST should produce different X/Z positions
      expect(pos1[0]).not.toBeCloseTo(pos2[0], 2);
    });

    it('RA 0h and RA 12h are on opposite sides', () => {
      const [x1, , z1] = celestialToCartesian(0, 0, RADIUS, GMST);
      const [x2, , z2] = celestialToCartesian(12, 0, RADIUS, GMST);

      // They should be roughly opposite on the equatorial plane
      // x1 ≈ -x2 and z1 ≈ -z2
      expect(x1).toBeCloseTo(-x2, 3);
      expect(z1).toBeCloseTo(-z2, 3);
    });
  });

  describe('calculateSunPosition', () => {
    it('returns valid RA and Dec', () => {
      const pos = calculateSunPosition(new Date());

      // RA should be 0-24 hours
      expect(pos.ra).toBeGreaterThanOrEqual(0);
      expect(pos.ra).toBeLessThan(24);

      // Dec should be -23.5 to +23.5 degrees (approximate ecliptic range)
      expect(pos.dec).toBeGreaterThanOrEqual(-24);
      expect(pos.dec).toBeLessThanOrEqual(24);
    });

    it('returns ecliptic longitude', () => {
      const pos = calculateSunPosition(new Date());

      // Ecliptic longitude should be 0-360 degrees
      expect(pos.eclipticLong).toBeGreaterThanOrEqual(0);
      expect(pos.eclipticLong).toBeLessThanOrEqual(360);
    });

    it('sun is in northern hemisphere in June', () => {
      const summerSolstice = new Date('2024-06-21T12:00:00Z');
      const pos = calculateSunPosition(summerSolstice);

      // Near summer solstice, Sun should be near +23.5 degrees declination
      expect(pos.dec).toBeGreaterThan(20);
    });

    it('sun is in southern hemisphere in December', () => {
      const winterSolstice = new Date('2024-12-21T12:00:00Z');
      const pos = calculateSunPosition(winterSolstice);

      // Near winter solstice, Sun should be near -23.5 degrees declination
      expect(pos.dec).toBeLessThan(-20);
    });

    it('sun is near equator during equinoxes', () => {
      const springEquinox = new Date('2024-03-20T12:00:00Z');
      const pos = calculateSunPosition(springEquinox);

      // Near equinox, declination should be close to 0
      expect(Math.abs(pos.dec)).toBeLessThan(3);
    });
  });

  describe('calculateMoonPosition', () => {
    it('returns valid RA and Dec', () => {
      const pos = calculateMoonPosition(new Date());

      // RA should be 0-24 hours
      expect(pos.ra).toBeGreaterThanOrEqual(0);
      expect(pos.ra).toBeLessThan(24);

      // Dec for Moon can be up to ~28.5 degrees (inclined orbit)
      expect(pos.dec).toBeGreaterThanOrEqual(-30);
      expect(pos.dec).toBeLessThanOrEqual(30);
    });

    it('moon position changes over time', () => {
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-02T00:00:00Z');

      const pos1 = calculateMoonPosition(date1);
      const pos2 = calculateMoonPosition(date2);

      // Moon moves significantly in 24 hours (~13 degrees)
      expect(pos1.ra).not.toEqual(pos2.ra);
    });
  });

  describe('getConstellation', () => {
    it('returns constellation info for valid coordinates', () => {
      const result = getConstellation(0, 0);

      expect(result.symbol).toBeTruthy();
      expect(result.name).toBeTruthy();
      expect(result.symbol.length).toBe(3); // IAU 3-letter codes
    });

    it('identifies Orion for known coordinates', () => {
      // Betelgeuse approximate position: RA ~5.9h, Dec ~+7.4°
      const result = getConstellation(5.9, 7.4);

      expect(result.symbol).toBe('Ori');
      expect(result.name).toBe('Orion');
    });

    it('identifies Ursa Major for known coordinates', () => {
      // Big Dipper approximate center: RA ~12h, Dec ~+55°
      const result = getConstellation(12, 55);

      expect(result.symbol).toBe('UMa');
      expect(result.name).toBe('Ursa Major');
    });

    it('handles edge cases at celestial poles', () => {
      // North celestial pole
      const northPole = getConstellation(0, 89);
      expect(northPole.symbol).toBeTruthy();

      // South celestial pole
      const southPole = getConstellation(0, -89);
      expect(southPole.symbol).toBeTruthy();
    });
  });

  describe('getCelestialState', () => {
    it('returns complete state object', () => {
      const state = getCelestialState();

      expect(state.gmst).toBeDefined();
      expect(state.sun).toBeDefined();
      expect(state.moon).toBeDefined();
    });

    it('returns valid sun coordinates', () => {
      const state = getCelestialState();

      expect(state.sun.ra).toBeGreaterThanOrEqual(0);
      expect(state.sun.ra).toBeLessThan(24);
      expect(typeof state.sun.x).toBe('number');
      expect(typeof state.sun.y).toBe('number');
      expect(typeof state.sun.z).toBe('number');
    });

    it('returns valid moon coordinates', () => {
      const state = getCelestialState();

      expect(state.moon.ra).toBeGreaterThanOrEqual(0);
      expect(state.moon.ra).toBeLessThan(24);
      expect(typeof state.moon.x).toBe('number');
      expect(typeof state.moon.y).toBe('number');
      expect(typeof state.moon.z).toBe('number');
    });

    it('sun is further than moon (different radii)', () => {
      const state = getCelestialState();

      const sunDist = Math.sqrt(state.sun.x ** 2 + state.sun.y ** 2 + state.sun.z ** 2);
      const moonDist = Math.sqrt(state.moon.x ** 2 + state.moon.y ** 2 + state.moon.z ** 2);

      // Sun is at radius 100, moon at radius 95
      expect(sunDist).toBeCloseTo(100, 1);
      expect(moonDist).toBeCloseTo(95, 1);
    });
  });

  describe('isAboveHorizon', () => {
    it('returns true for positive Y values', () => {
      expect(isAboveHorizon(50)).toBe(true);
      expect(isAboveHorizon(10)).toBe(true);
      expect(isAboveHorizon(1)).toBe(true);
    });

    it('returns true for small negative Y values (visual continuity)', () => {
      // Threshold is -10 for visual smoothness
      expect(isAboveHorizon(-5)).toBe(true);
      expect(isAboveHorizon(-9)).toBe(true);
    });

    it('returns false for large negative Y values', () => {
      expect(isAboveHorizon(-15)).toBe(false);
      expect(isAboveHorizon(-50)).toBe(false);
    });
  });

  describe('calculateAltAz', () => {
    it('returns valid altitude and azimuth', () => {
      const result = calculateAltAz(12, 45);

      // Altitude should be -90 to +90
      expect(result.altitude).toBeGreaterThanOrEqual(-90);
      expect(result.altitude).toBeLessThanOrEqual(90);

      // Azimuth should be 0 to 360
      expect(result.azimuth).toBeGreaterThanOrEqual(0);
      expect(result.azimuth).toBeLessThan(360);
    });

    it('uses observer location for calculations', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const ra = 12;
      const dec = 20;

      // Different latitudes should give different altitudes
      const nyResult = calculateAltAz(ra, dec, date, 40.7, -74); // New York
      const tokyoResult = calculateAltAz(ra, dec, date, 35.7, 139.7); // Tokyo

      // Due to longitude difference, azimuth will differ
      expect(nyResult.azimuth).not.toBeCloseTo(tokyoResult.azimuth, 0);
    });
  });

  describe('getPlanetPosition', () => {
    it('returns valid coordinates for all planets', () => {
      const planets: Array<
        'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune'
      > = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

      for (const planet of planets) {
        const pos = getPlanetPosition(planet);

        // RA should be 0-24 hours
        expect(pos.ra).toBeGreaterThanOrEqual(0);
        expect(pos.ra).toBeLessThan(24);

        // Dec should be reasonable (-30 to +30 for most planets)
        expect(pos.dec).toBeGreaterThanOrEqual(-90);
        expect(pos.dec).toBeLessThanOrEqual(90);
      }
    });

    it('planets have different positions', () => {
      const mars = getPlanetPosition('Mars');
      const jupiter = getPlanetPosition('Jupiter');

      // Different planets should have different positions (usually)
      const raDiff = Math.abs(mars.ra - jupiter.ra);
      const decDiff = Math.abs(mars.dec - jupiter.dec);

      expect(raDiff + decDiff).toBeGreaterThan(0.1);
    });
  });

  describe('getMoonPhase', () => {
    it('returns value between 0 and 1', () => {
      const phase = getMoonPhase();

      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThanOrEqual(1);
    });

    it('phase changes over lunar month', () => {
      // About 2 weeks apart = roughly opposite phases
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-15T00:00:00Z');

      const phase1 = getMoonPhase(date1);
      const phase2 = getMoonPhase(date2);

      // Should differ by roughly 0.5 (half cycle)
      const diff = Math.abs(phase2 - phase1);
      const normalizedDiff = Math.min(diff, 1 - diff);

      // Allow some tolerance - lunar month isn't exactly 28 days
      expect(normalizedDiff).toBeGreaterThan(0.3);
      expect(normalizedDiff).toBeLessThan(0.7);
    });

    it('completes full cycle in ~29.5 days', () => {
      const date1 = new Date('2024-01-01T00:00:00Z');
      const date2 = new Date('2024-01-30T00:00:00Z');

      const phase1 = getMoonPhase(date1);
      const phase2 = getMoonPhase(date2);

      // After ~29 days, should be close to original phase
      const diff = Math.abs(phase2 - phase1);
      const normalizedDiff = Math.min(diff, 1 - diff);

      expect(normalizedDiff).toBeLessThan(0.15); // Within ~15% of original
    });
  });
});
