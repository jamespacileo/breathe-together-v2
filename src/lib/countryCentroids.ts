/**
 * Country Centroid Data
 *
 * Geographic center coordinates for countries (lat, lng).
 * Used for positioning markers on the globe.
 *
 * Data source: Approximate geographic centroids
 */

export interface CountryCentroid {
  /** ISO 3166-1 alpha-2 country code */
  code: string;
  /** Country name for display */
  name: string;
  /** Latitude in degrees (-90 to 90) */
  lat: number;
  /** Longitude in degrees (-180 to 180) */
  lng: number;
}

/**
 * Country centroids indexed by ISO 3166-1 alpha-2 code
 */
export const COUNTRY_CENTROIDS: Record<string, CountryCentroid> = {
  // North America
  US: { code: 'US', name: 'United States', lat: 39.8, lng: -98.5 },
  CA: { code: 'CA', name: 'Canada', lat: 56.1, lng: -106.3 },
  MX: { code: 'MX', name: 'Mexico', lat: 23.6, lng: -102.5 },

  // South America
  BR: { code: 'BR', name: 'Brazil', lat: -14.2, lng: -51.9 },
  AR: { code: 'AR', name: 'Argentina', lat: -38.4, lng: -63.6 },
  CL: { code: 'CL', name: 'Chile', lat: -35.7, lng: -71.5 },
  CO: { code: 'CO', name: 'Colombia', lat: 4.6, lng: -74.3 },
  PE: { code: 'PE', name: 'Peru', lat: -9.2, lng: -75.0 },

  // Europe
  GB: { code: 'GB', name: 'United Kingdom', lat: 55.4, lng: -3.4 },
  DE: { code: 'DE', name: 'Germany', lat: 51.2, lng: 10.5 },
  FR: { code: 'FR', name: 'France', lat: 46.2, lng: 2.2 },
  IT: { code: 'IT', name: 'Italy', lat: 41.9, lng: 12.6 },
  ES: { code: 'ES', name: 'Spain', lat: 40.5, lng: -3.7 },
  PT: { code: 'PT', name: 'Portugal', lat: 39.4, lng: -8.2 },
  NL: { code: 'NL', name: 'Netherlands', lat: 52.1, lng: 5.3 },
  BE: { code: 'BE', name: 'Belgium', lat: 50.5, lng: 4.5 },
  CH: { code: 'CH', name: 'Switzerland', lat: 46.8, lng: 8.2 },
  AT: { code: 'AT', name: 'Austria', lat: 47.5, lng: 14.6 },
  SE: { code: 'SE', name: 'Sweden', lat: 60.1, lng: 18.6 },
  NO: { code: 'NO', name: 'Norway', lat: 60.5, lng: 8.5 },
  DK: { code: 'DK', name: 'Denmark', lat: 56.3, lng: 9.5 },
  FI: { code: 'FI', name: 'Finland', lat: 61.9, lng: 25.7 },
  PL: { code: 'PL', name: 'Poland', lat: 51.9, lng: 19.1 },
  CZ: { code: 'CZ', name: 'Czech Republic', lat: 49.8, lng: 15.5 },
  GR: { code: 'GR', name: 'Greece', lat: 39.1, lng: 21.8 },
  IE: { code: 'IE', name: 'Ireland', lat: 53.1, lng: -8.0 },
  HU: { code: 'HU', name: 'Hungary', lat: 47.2, lng: 19.5 },
  RO: { code: 'RO', name: 'Romania', lat: 45.9, lng: 24.9 },
  UA: { code: 'UA', name: 'Ukraine', lat: 48.4, lng: 31.2 },
  RU: { code: 'RU', name: 'Russia', lat: 61.5, lng: 105.3 },

  // Asia
  JP: { code: 'JP', name: 'Japan', lat: 36.2, lng: 138.3 },
  CN: { code: 'CN', name: 'China', lat: 35.9, lng: 104.2 },
  KR: { code: 'KR', name: 'South Korea', lat: 35.9, lng: 127.8 },
  IN: { code: 'IN', name: 'India', lat: 20.6, lng: 78.9 },
  TH: { code: 'TH', name: 'Thailand', lat: 15.9, lng: 100.9 },
  VN: { code: 'VN', name: 'Vietnam', lat: 14.1, lng: 108.3 },
  SG: { code: 'SG', name: 'Singapore', lat: 1.4, lng: 103.8 },
  MY: { code: 'MY', name: 'Malaysia', lat: 4.2, lng: 101.9 },
  ID: { code: 'ID', name: 'Indonesia', lat: -0.8, lng: 113.9 },
  PH: { code: 'PH', name: 'Philippines', lat: 12.9, lng: 121.8 },
  TW: { code: 'TW', name: 'Taiwan', lat: 23.7, lng: 121.0 },
  HK: { code: 'HK', name: 'Hong Kong', lat: 22.4, lng: 114.1 },
  IL: { code: 'IL', name: 'Israel', lat: 31.0, lng: 34.9 },
  AE: { code: 'AE', name: 'UAE', lat: 23.4, lng: 53.8 },
  SA: { code: 'SA', name: 'Saudi Arabia', lat: 23.9, lng: 45.1 },
  TR: { code: 'TR', name: 'Turkey', lat: 38.9, lng: 35.2 },
  PK: { code: 'PK', name: 'Pakistan', lat: 30.4, lng: 69.3 },
  BD: { code: 'BD', name: 'Bangladesh', lat: 23.7, lng: 90.4 },

  // Oceania
  AU: { code: 'AU', name: 'Australia', lat: -25.3, lng: 133.8 },
  NZ: { code: 'NZ', name: 'New Zealand', lat: -40.9, lng: 174.9 },

  // Africa
  ZA: { code: 'ZA', name: 'South Africa', lat: -30.6, lng: 22.9 },
  EG: { code: 'EG', name: 'Egypt', lat: 26.8, lng: 30.8 },
  NG: { code: 'NG', name: 'Nigeria', lat: 9.1, lng: 8.7 },
  KE: { code: 'KE', name: 'Kenya', lat: -0.0, lng: 37.9 },
  MA: { code: 'MA', name: 'Morocco', lat: 31.8, lng: -7.1 },
};

/**
 * Convert lat/lng to 3D position on a unit sphere
 * @param lat Latitude in degrees
 * @param lng Longitude in degrees
 * @param radius Sphere radius (default 1)
 * @returns [x, y, z] position
 */
export function latLngToPosition(lat: number, lng: number, radius = 1): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

/**
 * Get country centroid by code
 */
export function getCountryCentroid(code: string): CountryCentroid | undefined {
  return COUNTRY_CENTROIDS[code.toUpperCase()];
}

/**
 * Get all countries with data
 */
export function getAllCountries(): CountryCentroid[] {
  return Object.values(COUNTRY_CENTROIDS);
}
