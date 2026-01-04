/**
 * Constellation data with astronomical coordinates
 * Uses spherical coordinates (Right Ascension, Declination) converted to 3D positions
 */

import type { Vector3 } from 'three';

export interface Star {
  /** Star name or designation */
  name: string;
  /** Right Ascension in hours (0-24) */
  ra: number;
  /** Declination in degrees (-90 to 90) */
  dec: number;
  /** Visual magnitude (brightness, lower = brighter) */
  magnitude: number;
}

export interface Constellation {
  /** Constellation name */
  name: string;
  /** Stars in the constellation */
  stars: Star[];
  /** Connections between stars (indices into stars array) */
  connections: [number, number][];
}

/**
 * Convert spherical coordinates (RA, Dec) to Cartesian (x, y, z)
 * @param ra Right Ascension in hours (0-24)
 * @param dec Declination in degrees (-90 to 90)
 * @param radius Distance from origin
 */
export function raDecToCartesian(ra: number, dec: number, radius = 100): Vector3 {
  // Convert RA (hours) to radians: RA * 15° * π/180
  const raRad = (ra * 15 * Math.PI) / 180;
  // Convert Dec (degrees) to radians
  const decRad = (dec * Math.PI) / 180;

  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.sin(raRad);

  return { x, y, z } as Vector3;
}

/**
 * Major constellations visible from northern hemisphere
 * Star data from astronomical catalogs (simplified for visualization)
 */
export const CONSTELLATIONS: Constellation[] = [
  // Ursa Major (Big Dipper) - most recognizable northern constellation
  {
    name: 'Ursa Major',
    stars: [
      { name: 'Dubhe', ra: 11.062, dec: 61.751, magnitude: 1.79 },
      { name: 'Merak', ra: 11.031, dec: 56.382, magnitude: 2.37 },
      { name: 'Phecda', ra: 11.897, dec: 53.695, magnitude: 2.44 },
      { name: 'Megrez', ra: 12.257, dec: 57.033, magnitude: 3.31 },
      { name: 'Alioth', ra: 12.9, dec: 55.96, magnitude: 1.77 },
      { name: 'Mizar', ra: 13.399, dec: 54.925, magnitude: 2.27 },
      { name: 'Alkaid', ra: 13.792, dec: 49.313, magnitude: 1.86 },
    ],
    connections: [
      [0, 1], // Dubhe - Merak
      [1, 2], // Merak - Phecda
      [2, 3], // Phecda - Megrez
      [3, 4], // Megrez - Alioth
      [4, 5], // Alioth - Mizar
      [5, 6], // Mizar - Alkaid
    ],
  },

  // Orion - winter constellation, most recognizable globally
  {
    name: 'Orion',
    stars: [
      { name: 'Betelgeuse', ra: 5.919, dec: 7.407, magnitude: 0.5 },
      { name: 'Rigel', ra: 5.242, dec: -8.202, magnitude: 0.13 },
      { name: 'Bellatrix', ra: 5.418, dec: 6.35, magnitude: 1.64 },
      { name: 'Mintaka', ra: 5.533, dec: -0.299, magnitude: 2.23 },
      { name: 'Alnilam', ra: 5.603, dec: -1.202, magnitude: 1.69 },
      { name: 'Alnitak', ra: 5.679, dec: -1.943, magnitude: 1.77 },
      { name: 'Saiph', ra: 5.796, dec: -9.67, magnitude: 2.09 },
    ],
    connections: [
      [0, 2], // Betelgeuse - Bellatrix (shoulders)
      [2, 3], // Bellatrix - Mintaka
      [3, 4], // Mintaka - Alnilam (belt)
      [4, 5], // Alnilam - Alnitak (belt)
      [0, 4], // Betelgeuse - Alnilam
      [1, 5], // Rigel - Alnitak
      [1, 6], // Rigel - Saiph (knees)
    ],
  },

  // Cassiopeia - distinctive W shape
  {
    name: 'Cassiopeia',
    stars: [
      { name: 'Schedar', ra: 0.675, dec: 56.537, magnitude: 2.23 },
      { name: 'Caph', ra: 0.153, dec: 59.15, magnitude: 2.27 },
      { name: 'Gamma Cas', ra: 0.945, dec: 60.717, magnitude: 2.47 },
      { name: 'Ruchbah', ra: 1.43, dec: 60.235, magnitude: 2.68 },
      { name: 'Segin', ra: 1.906, dec: 63.67, magnitude: 3.38 },
    ],
    connections: [
      [1, 0], // Caph - Schedar
      [0, 2], // Schedar - Gamma Cas
      [2, 3], // Gamma Cas - Ruchbah
      [3, 4], // Ruchbah - Segin
    ],
  },

  // Leo - spring constellation
  {
    name: 'Leo',
    stars: [
      { name: 'Regulus', ra: 10.139, dec: 11.967, magnitude: 1.35 },
      { name: 'Denebola', ra: 11.818, dec: 14.572, magnitude: 2.14 },
      { name: 'Algieba', ra: 10.333, dec: 19.842, magnitude: 2.08 },
      { name: 'Zosma', ra: 11.235, dec: 20.524, magnitude: 2.56 },
      { name: 'Chertan', ra: 11.237, dec: 15.43, magnitude: 3.34 },
    ],
    connections: [
      [0, 2], // Regulus - Algieba
      [2, 3], // Algieba - Zosma
      [3, 1], // Zosma - Denebola
      [1, 4], // Denebola - Chertan
      [4, 0], // Chertan - Regulus
    ],
  },

  // Cygnus (Northern Cross) - summer constellation
  {
    name: 'Cygnus',
    stars: [
      { name: 'Deneb', ra: 20.69, dec: 45.28, magnitude: 1.25 },
      { name: 'Sadr', ra: 20.37, dec: 40.257, magnitude: 2.2 },
      { name: 'Gienah', ra: 20.77, dec: 33.97, magnitude: 2.46 },
      { name: 'Delta Cyg', ra: 19.749, dec: 45.131, magnitude: 2.87 },
      { name: 'Albireo', ra: 19.512, dec: 27.96, magnitude: 3.18 },
    ],
    connections: [
      [0, 1], // Deneb - Sadr (vertical)
      [1, 2], // Sadr - Gienah (vertical)
      [3, 1], // Delta - Sadr (horizontal)
      [1, 4], // Sadr - Albireo (horizontal)
    ],
  },

  // Scorpius - summer constellation
  {
    name: 'Scorpius',
    stars: [
      { name: 'Antares', ra: 16.49, dec: -26.432, magnitude: 1.09 },
      { name: 'Shaula', ra: 17.56, dec: -37.103, magnitude: 1.63 },
      { name: 'Sargas', ra: 17.621, dec: -42.998, magnitude: 1.87 },
      { name: 'Dschubba', ra: 16.004, dec: -22.622, magnitude: 2.32 },
      { name: 'Graffias', ra: 16.091, dec: -19.805, magnitude: 2.56 },
    ],
    connections: [
      [4, 3], // Graffias - Dschubba
      [3, 0], // Dschubba - Antares
      [0, 1], // Antares - Shaula
      [1, 2], // Shaula - Sargas
    ],
  },
];

/**
 * Generate star field background (fainter stars not in constellations)
 * @param count Number of background stars
 * @param radius Sphere radius
 */
export function generateBackgroundStars(count: number, radius = 100): Vector3[] {
  const stars: Vector3[] = [];

  for (let i = 0; i < count; i++) {
    // Use golden ratio for even distribution on sphere (Fibonacci sphere)
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    stars.push({ x, y, z } as Vector3);
  }

  return stars;
}
