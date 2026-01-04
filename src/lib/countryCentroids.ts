/**
 * Country Centroids - Latitude/Longitude coordinates for country centers
 *
 * Used to position geo markers on the globe. These coordinates represent
 * approximate geographic centers of countries, suitable for visualization.
 *
 * ISO 3166-1 alpha-2 country codes
 */

export interface CountryCentroid {
  lat: number;
  lng: number;
  name: string;
}

/**
 * Country centroids indexed by ISO 3166-1 alpha-2 codes
 * Coordinates represent approximate geographic centers
 */
export const COUNTRY_CENTROIDS: Record<string, CountryCentroid> = {
  // North America
  US: { lat: 39.8283, lng: -98.5795, name: 'United States' },
  CA: { lat: 56.1304, lng: -106.3468, name: 'Canada' },
  MX: { lat: 23.6345, lng: -102.5528, name: 'Mexico' },

  // South America
  BR: { lat: -14.235, lng: -51.9253, name: 'Brazil' },
  AR: { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
  CL: { lat: -35.6751, lng: -71.543, name: 'Chile' },
  CO: { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
  PE: { lat: -9.19, lng: -75.0152, name: 'Peru' },

  // Europe
  GB: { lat: 55.3781, lng: -3.436, name: 'United Kingdom' },
  DE: { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  FR: { lat: 46.2276, lng: 2.2137, name: 'France' },
  IT: { lat: 41.8719, lng: 12.5674, name: 'Italy' },
  ES: { lat: 40.4637, lng: -3.7492, name: 'Spain' },
  NL: { lat: 52.1326, lng: 5.2913, name: 'Netherlands' },
  BE: { lat: 50.5039, lng: 4.4699, name: 'Belgium' },
  PT: { lat: 39.3999, lng: -8.2245, name: 'Portugal' },
  SE: { lat: 60.1282, lng: 18.6435, name: 'Sweden' },
  NO: { lat: 60.472, lng: 8.4689, name: 'Norway' },
  DK: { lat: 56.2639, lng: 9.5018, name: 'Denmark' },
  FI: { lat: 61.9241, lng: 25.7482, name: 'Finland' },
  PL: { lat: 51.9194, lng: 19.1451, name: 'Poland' },
  AT: { lat: 47.5162, lng: 14.5501, name: 'Austria' },
  CH: { lat: 46.8182, lng: 8.2275, name: 'Switzerland' },
  IE: { lat: 53.1424, lng: -7.6921, name: 'Ireland' },
  CZ: { lat: 49.8175, lng: 15.473, name: 'Czechia' },
  GR: { lat: 39.0742, lng: 21.8243, name: 'Greece' },
  RO: { lat: 45.9432, lng: 24.9668, name: 'Romania' },
  HU: { lat: 47.1625, lng: 19.5033, name: 'Hungary' },
  UA: { lat: 48.3794, lng: 31.1656, name: 'Ukraine' },
  RU: { lat: 61.524, lng: 105.3188, name: 'Russia' },

  // Asia
  CN: { lat: 35.8617, lng: 104.1954, name: 'China' },
  JP: { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  KR: { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
  IN: { lat: 20.5937, lng: 78.9629, name: 'India' },
  ID: { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
  TH: { lat: 15.87, lng: 100.9925, name: 'Thailand' },
  VN: { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
  PH: { lat: 12.8797, lng: 121.774, name: 'Philippines' },
  MY: { lat: 4.2105, lng: 101.9758, name: 'Malaysia' },
  SG: { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
  TW: { lat: 23.6978, lng: 120.9605, name: 'Taiwan' },
  HK: { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
  PK: { lat: 30.3753, lng: 69.3451, name: 'Pakistan' },
  BD: { lat: 23.685, lng: 90.3563, name: 'Bangladesh' },

  // Middle East
  IL: { lat: 31.0461, lng: 34.8516, name: 'Israel' },
  AE: { lat: 23.4241, lng: 53.8478, name: 'United Arab Emirates' },
  SA: { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
  TR: { lat: 38.9637, lng: 35.2433, name: 'Turkey' },

  // Africa
  ZA: { lat: -30.5595, lng: 22.9375, name: 'South Africa' },
  NG: { lat: 9.082, lng: 8.6753, name: 'Nigeria' },
  EG: { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
  KE: { lat: -0.0236, lng: 37.9062, name: 'Kenya' },
  MA: { lat: 31.7917, lng: -7.0926, name: 'Morocco' },

  // Oceania
  AU: { lat: -25.2744, lng: 133.7751, name: 'Australia' },
  NZ: { lat: -40.9006, lng: 174.886, name: 'New Zealand' },
};

/**
 * Convert latitude/longitude to 3D position on sphere
 *
 * @param lat - Latitude in degrees (-90 to 90)
 * @param lng - Longitude in degrees (-180 to 180)
 * @param radius - Sphere radius
 * @returns [x, y, z] position on sphere surface
 */
export function latLngToPosition(
  lat: number,
  lng: number,
  radius: number,
): [number, number, number] {
  // Convert degrees to radians
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  // Spherical to Cartesian conversion
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}

/**
 * Get position for a country on the globe
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param radius - Globe radius
 * @returns [x, y, z] position or null if country not found
 */
export function getCountryPosition(
  countryCode: string,
  radius: number,
): [number, number, number] | null {
  const centroid = COUNTRY_CENTROIDS[countryCode];
  if (!centroid) return null;
  return latLngToPosition(centroid.lat, centroid.lng, radius);
}

/**
 * Get country name from code
 */
export function getCountryName(countryCode: string): string {
  return COUNTRY_CENTROIDS[countryCode]?.name || countryCode;
}
