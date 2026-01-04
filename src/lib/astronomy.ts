/**
 * Astronomical calculations for realistic celestial positioning.
 *
 * Converts Right Ascension (RA) and Declination (Dec) coordinates
 * to 3D positions based on current UTC time and observer location.
 *
 * References:
 * - Meeus, Jean. "Astronomical Algorithms" (1991)
 * - USNO Astronomical Almanac
 */

// Earth's axial tilt in radians (obliquity of the ecliptic)
const OBLIQUITY = 23.4393 * (Math.PI / 180);

// Julian date constants
const J2000 = 2451545.0; // Julian date for J2000.0 epoch (2000-01-01 12:00 TT)
const UNIX_J2000 = 946728000000; // Unix timestamp for J2000.0 in ms

/**
 * Convert a Date to Julian Date
 */
export function dateToJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Calculate Julian centuries since J2000.0
 */
export function julianCenturies(jd: number): number {
  return (jd - J2000) / 36525;
}

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) in radians
 * This determines the rotation of the celestial sphere at a given time
 */
export function calculateGMST(date: Date): number {
  const jd = dateToJulian(date);
  const T = julianCenturies(jd);

  // GMST at 0h UT in degrees (IAU 2006 precession model simplified)
  let gmst =
    280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000;

  // Normalize to 0-360 degrees
  gmst = ((gmst % 360) + 360) % 360;

  // Convert to radians
  return gmst * (Math.PI / 180);
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
 * Uses simplified astronomical almanac formulas
 *
 * @param date - Current date/time
 * @returns { ra, dec, distance } - RA in hours, Dec in degrees
 */
export function calculateSunPosition(date: Date): {
  ra: number;
  dec: number;
  eclipticLong: number;
} {
  // Days since J2000.0
  const d = (date.getTime() - UNIX_J2000) / 86400000;

  // Mean longitude of the Sun (degrees)
  let L = 280.46 + 0.9856474 * d;
  L = ((L % 360) + 360) % 360;

  // Mean anomaly (degrees)
  let g = 357.528 + 0.9856003 * d;
  g = ((g % 360) + 360) % 360;
  const gRad = g * (Math.PI / 180);

  // Ecliptic longitude (degrees)
  let eclipticLong = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad);
  eclipticLong = ((eclipticLong % 360) + 360) % 360;
  const eclipticLongRad = eclipticLong * (Math.PI / 180);

  // Convert ecliptic to equatorial coordinates
  // RA in radians
  const raRad = Math.atan2(
    Math.cos(OBLIQUITY) * Math.sin(eclipticLongRad),
    Math.cos(eclipticLongRad),
  );

  // Dec in radians
  const decRad = Math.asin(Math.sin(OBLIQUITY) * Math.sin(eclipticLongRad));

  // Convert RA to hours (0-24)
  const ra = ((raRad * 12) / Math.PI + 24) % 24;

  // Convert Dec to degrees
  const dec = decRad * (180 / Math.PI);

  return { ra, dec, eclipticLong };
}

/**
 * Calculate moon position (simplified)
 * Returns approximate celestial coordinates
 */
export function calculateMoonPosition(date: Date): { ra: number; dec: number } {
  // Days since J2000.0
  const d = (date.getTime() - UNIX_J2000) / 86400000;

  // Mean longitude (degrees)
  let L = 218.32 + 13.1763966 * d;
  L = ((L % 360) + 360) % 360;

  // Mean anomaly (degrees)
  let M = 134.963 + 13.064993 * d;
  M = ((M % 360) + 360) % 360;
  const MRad = M * (Math.PI / 180);

  // Mean distance (degrees)
  let F = 93.272 + 13.2293506 * d;
  F = ((F % 360) + 360) % 360;

  // Ecliptic longitude
  let eclipticLong = L + 6.29 * Math.sin(MRad);
  eclipticLong = ((eclipticLong % 360) + 360) % 360;
  const eclipticLongRad = eclipticLong * (Math.PI / 180);

  // Ecliptic latitude (simplified)
  const eclipticLat = 5.13 * Math.sin(F * (Math.PI / 180));
  const eclipticLatRad = eclipticLat * (Math.PI / 180);

  // Convert to equatorial coordinates
  const raRad = Math.atan2(
    Math.cos(OBLIQUITY) * Math.sin(eclipticLongRad) -
      Math.tan(eclipticLatRad) * Math.sin(OBLIQUITY),
    Math.cos(eclipticLongRad),
  );

  const decRad = Math.asin(
    Math.sin(eclipticLatRad) * Math.cos(OBLIQUITY) +
      Math.cos(eclipticLatRad) * Math.sin(OBLIQUITY) * Math.sin(eclipticLongRad),
  );

  const ra = ((raRad * 12) / Math.PI + 24) % 24;
  const dec = decRad * (180 / Math.PI);

  return { ra, dec };
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
 * Used for determining visibility and brightness
 */
export function calculateAltAz(
  ra: number,
  dec: number,
  gmst: number,
  lat: number = 40, // Default to mid-northern latitude
): { altitude: number; azimuth: number } {
  const raRad = ra * (Math.PI / 12);
  const decRad = dec * (Math.PI / 180);
  const latRad = lat * (Math.PI / 180);

  // Hour angle
  const ha = gmst - raRad;

  // Altitude
  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha);
  const altitude = Math.asin(sinAlt) * (180 / Math.PI);

  // Azimuth
  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
    (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (180 / Math.PI);

  if (Math.sin(ha) > 0) {
    azimuth = 360 - azimuth;
  }

  return { altitude, azimuth };
}
