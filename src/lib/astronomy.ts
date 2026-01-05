/**
 * Astronomical calculations using astronomy-engine library.
 *
 * Provides accurate celestial positioning for sun, moon, and stars
 * using high-precision algorithms from the astronomy-engine library.
 *
 * References:
 * - astronomy-engine: https://github.com/cosinekitty/astronomy
 * - Meeus, Jean. "Astronomical Algorithms" (1991)
 */

import * as Astronomy from 'astronomy-engine';

// Default observer at center of Earth (for geocentric calculations)
const GEOCENTRIC_OBSERVER = new Astronomy.Observer(0, 0, 0);

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) in radians
 * This determines the rotation of the celestial sphere at a given time
 */
export function calculateGMST(date: Date): number {
  // Use astronomy-engine for precise sidereal time
  const time = Astronomy.MakeTime(date);
  // SiderealTime returns hours, convert to radians
  const gmstHours = Astronomy.SiderealTime(time);
  return gmstHours * (Math.PI / 12);
}

/**
 * Convert celestial coordinates (RA/Dec) to 3D cartesian position
 *
 * @param ra - Right Ascension in hours (0-24)
 * @param dec - Declination in degrees (-90 to +90)
 * @param distance - Distance from origin (sphere radius)
 * @param gmst - Greenwich Mean Sidereal Time in radians
 * @returns [x, y, z] position on celestial sphere
 */
export function celestialToCartesian(
  ra: number,
  dec: number,
  distance: number,
  gmst: number,
): [number, number, number] {
  // Convert RA from hours to radians
  const raRad = ra * (Math.PI / 12);

  // Convert Dec from degrees to radians
  const decRad = dec * (Math.PI / 180);

  // Apply Earth's rotation via GMST (rotate the celestial sphere)
  const localRA = raRad - gmst;

  // Convert spherical to cartesian
  // Y is up (toward celestial north pole)
  // X and Z are the equatorial plane
  const cosDecRad = Math.cos(decRad);

  const x = distance * cosDecRad * Math.cos(localRA);
  const z = distance * cosDecRad * Math.sin(localRA);
  const y = distance * Math.sin(decRad);

  return [x, y, z];
}

/**
 * Calculate the Sun's position in celestial coordinates
 * Uses astronomy-engine for high-precision calculations
 *
 * @param date - Current date/time
 * @returns { ra, dec, eclipticLong } - RA in hours, Dec in degrees
 */
export function calculateSunPosition(date: Date): {
  ra: number;
  dec: number;
  eclipticLong: number;
} {
  const time = Astronomy.MakeTime(date);

  // Get Sun's equatorial coordinates (geocentric)
  const equ = Astronomy.Equator(Astronomy.Body.Sun, time, GEOCENTRIC_OBSERVER, true, true);

  // Get Sun's ecliptic coordinates for ecliptic longitude
  const ecl = Astronomy.SunPosition(time);

  return {
    ra: equ.ra,
    dec: equ.dec,
    eclipticLong: ecl.elon,
  };
}

/**
 * Calculate moon position using astronomy-engine
 * Returns celestial coordinates
 */
export function calculateMoonPosition(date: Date): { ra: number; dec: number } {
  const time = Astronomy.MakeTime(date);

  // Get Moon's equatorial coordinates (geocentric)
  const equ = Astronomy.Equator(Astronomy.Body.Moon, time, GEOCENTRIC_OBSERVER, true, true);

  return {
    ra: equ.ra,
    dec: equ.dec,
  };
}

/**
 * Get the constellation containing a given celestial position
 *
 * @param ra - Right Ascension in hours (0-24)
 * @param dec - Declination in degrees (-90 to +90)
 * @returns Constellation info with symbol and name
 */
export function getConstellation(ra: number, dec: number): { symbol: string; name: string } {
  const result = Astronomy.Constellation(ra, dec);
  return {
    symbol: result.symbol,
    name: result.name,
  };
}

/**
 * Get all celestial positions for a given date
 * Convenient wrapper for rendering
 */
export function getCelestialState(date: Date = new Date()): {
  gmst: number;
  sun: { ra: number; dec: number; x: number; y: number; z: number };
  moon: { ra: number; dec: number; x: number; y: number; z: number };
} {
  const gmst = calculateGMST(date);
  const sunPos = calculateSunPosition(date);
  const moonPos = calculateMoonPosition(date);

  const sunCartesian = celestialToCartesian(sunPos.ra, sunPos.dec, 100, gmst);
  const moonCartesian = celestialToCartesian(moonPos.ra, moonPos.dec, 95, gmst);

  return {
    gmst,
    sun: {
      ra: sunPos.ra,
      dec: sunPos.dec,
      x: sunCartesian[0],
      y: sunCartesian[1],
      z: sunCartesian[2],
    },
    moon: {
      ra: moonPos.ra,
      dec: moonPos.dec,
      x: moonCartesian[0],
      y: moonCartesian[1],
      z: moonCartesian[2],
    },
  };
}

/**
 * Check if a celestial object is above the horizon
 * For a viewer at the center looking "outward" in all directions,
 * we consider objects with positive Y as "above horizon"
 */
export function isAboveHorizon(y: number): boolean {
  return y > -10; // Allow some objects slightly below for visual continuity
}

/**
 * Calculate altitude and azimuth for a celestial position
 * Uses astronomy-engine for observer-based horizontal coordinates
 *
 * @param ra - Right Ascension in hours
 * @param dec - Declination in degrees
 * @param date - Date/time of observation
 * @param lat - Observer latitude in degrees
 * @param lon - Observer longitude in degrees
 */
export function calculateAltAz(
  ra: number,
  dec: number,
  date: Date = new Date(),
  lat: number = 40, // Default to mid-northern latitude
  lon: number = 0, // Default to prime meridian
): { altitude: number; azimuth: number } {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(lat, lon, 0);

  // Use Horizon function directly with RA/Dec
  const hor = Astronomy.Horizon(time, observer, ra, dec, 'normal');

  return {
    altitude: hor.altitude,
    azimuth: hor.azimuth,
  };
}

/**
 * Get planet position in celestial coordinates
 *
 * @param body - Planet name (Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune)
 * @param date - Date/time for calculation
 */
export function getPlanetPosition(
  body: 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune',
  date: Date = new Date(),
): { ra: number; dec: number } {
  const time = Astronomy.MakeTime(date);
  const bodyEnum = Astronomy.Body[body];
  const equ = Astronomy.Equator(bodyEnum, time, GEOCENTRIC_OBSERVER, true, true);

  return {
    ra: equ.ra,
    dec: equ.dec,
  };
}

/**
 * Calculate moon phase (0-1 where 0=new, 0.5=full)
 */
export function getMoonPhase(date: Date = new Date()): number {
  const time = Astronomy.MakeTime(date);
  const phase = Astronomy.MoonPhase(time);
  return phase / 360; // Convert 0-360 to 0-1
}

// Re-export useful types from astronomy-engine
export type { AstroTime } from 'astronomy-engine';
export { Body as CelestialBody } from 'astronomy-engine';
