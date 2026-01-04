/**
 * Constellation Data - Real constellation patterns projected onto a celestial sphere
 *
 * Star positions are in spherical coordinates (theta, phi) normalized to [0,1]:
 * - theta: horizontal angle (0-1 maps to 0-2π)
 * - phi: vertical angle (0-1 maps to 0-π, where 0.5 is equator)
 *
 * Connections define line segments between star indices within each constellation
 *
 * Brightness values range from 0.5 to 1.0 (relative star magnitude)
 */

export interface ConstellationStar {
  /** Horizontal angle normalized [0,1] */
  theta: number;
  /** Vertical angle normalized [0,1] */
  phi: number;
  /** Relative brightness [0.5-1.0] */
  brightness: number;
  /** Star name (optional) */
  name?: string;
}

export interface Constellation {
  /** Constellation name */
  name: string;
  /** Stars in this constellation */
  stars: ConstellationStar[];
  /** Line connections as pairs of star indices */
  connections: [number, number][];
  /** Color tint for this constellation's lines */
  color: string;
}

// Major constellations with simplified star patterns
// Positions are stylized for visual appeal while maintaining recognizable shapes
export const CONSTELLATIONS: Constellation[] = [
  // === ORION - The Hunter ===
  {
    name: 'Orion',
    stars: [
      { theta: 0.08, phi: 0.42, brightness: 1.0, name: 'Betelgeuse' }, // 0 - Red supergiant
      { theta: 0.12, phi: 0.42, brightness: 0.95, name: 'Bellatrix' }, // 1
      { theta: 0.09, phi: 0.48, brightness: 0.85, name: 'Meissa' }, // 2 - Head
      { theta: 0.08, phi: 0.55, brightness: 1.0, name: 'Rigel' }, // 3 - Blue supergiant
      { theta: 0.12, phi: 0.55, brightness: 0.9, name: 'Saiph' }, // 4
      { theta: 0.095, phi: 0.485, brightness: 0.8, name: 'Alnitak' }, // 5 - Belt
      { theta: 0.1, phi: 0.49, brightness: 0.85, name: 'Alnilam' }, // 6 - Belt center
      { theta: 0.105, phi: 0.495, brightness: 0.8, name: 'Mintaka' }, // 7 - Belt
    ],
    connections: [
      [0, 1], // Shoulders
      [0, 5], // Left arm down
      [1, 7], // Right arm down
      [5, 6],
      [6, 7], // Belt
      [5, 3], // Left leg
      [7, 4], // Right leg
      [0, 2], // Head connection
      [1, 2],
    ],
    color: '#88ccff',
  },

  // === URSA MAJOR - Big Dipper (main asterism) ===
  {
    name: 'Ursa Major',
    stars: [
      { theta: 0.35, phi: 0.25, brightness: 0.9, name: 'Alkaid' }, // 0 - Handle end
      { theta: 0.33, phi: 0.24, brightness: 0.85, name: 'Mizar' }, // 1
      { theta: 0.31, phi: 0.23, brightness: 0.85, name: 'Alioth' }, // 2
      { theta: 0.29, phi: 0.23, brightness: 0.8, name: 'Megrez' }, // 3 - Bowl corner
      { theta: 0.28, phi: 0.21, brightness: 0.9, name: 'Phecda' }, // 4
      { theta: 0.3, phi: 0.2, brightness: 0.95, name: 'Merak' }, // 5
      { theta: 0.3, phi: 0.24, brightness: 0.95, name: 'Dubhe' }, // 6
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3], // Handle
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3], // Bowl
    ],
    color: '#aaddff',
  },

  // === CASSIOPEIA - The Queen ===
  {
    name: 'Cassiopeia',
    stars: [
      { theta: 0.55, phi: 0.22, brightness: 0.9, name: 'Schedar' }, // 0
      { theta: 0.53, phi: 0.2, brightness: 0.85, name: 'Caph' }, // 1
      { theta: 0.57, phi: 0.21, brightness: 0.95, name: 'Gamma Cas' }, // 2 - Center
      { theta: 0.59, phi: 0.23, brightness: 0.85, name: 'Ruchbah' }, // 3
      { theta: 0.61, phi: 0.21, brightness: 0.8, name: 'Segin' }, // 4
    ],
    connections: [
      [0, 2],
      [1, 0],
      [2, 3],
      [3, 4],
    ],
    color: '#ffccaa',
  },

  // === CYGNUS - The Swan (Northern Cross) ===
  {
    name: 'Cygnus',
    stars: [
      { theta: 0.72, phi: 0.35, brightness: 1.0, name: 'Deneb' }, // 0 - Tail
      { theta: 0.72, phi: 0.4, brightness: 0.85, name: 'Sadr' }, // 1 - Center
      { theta: 0.72, phi: 0.45, brightness: 0.9, name: 'Albireo' }, // 2 - Head
      { theta: 0.69, phi: 0.4, brightness: 0.8, name: 'Gienah' }, // 3 - Wing
      { theta: 0.75, phi: 0.4, brightness: 0.8, name: 'Delta Cyg' }, // 4 - Wing
    ],
    connections: [
      [0, 1],
      [1, 2], // Body
      [3, 1],
      [1, 4], // Wings
    ],
    color: '#aaffcc',
  },

  // === LEO - The Lion ===
  {
    name: 'Leo',
    stars: [
      { theta: 0.22, phi: 0.45, brightness: 1.0, name: 'Regulus' }, // 0 - Heart
      { theta: 0.24, phi: 0.42, brightness: 0.85, name: 'Eta Leo' }, // 1
      { theta: 0.21, phi: 0.4, brightness: 0.8, name: 'Adhafera' }, // 2
      { theta: 0.19, phi: 0.41, brightness: 0.75, name: 'Rasalas' }, // 3 - Head
      { theta: 0.18, phi: 0.43, brightness: 0.8, name: 'Epsilon Leo' }, // 4
      { theta: 0.26, phi: 0.44, brightness: 0.9, name: 'Denebola' }, // 5 - Tail
      { theta: 0.25, phi: 0.46, brightness: 0.85, name: 'Zosma' }, // 6
    ],
    connections: [
      [3, 2],
      [2, 1],
      [1, 0], // Head/mane
      [4, 3],
      [4, 0], // Mane curve
      [0, 6],
      [6, 5], // Body to tail
    ],
    color: '#ffdd88',
  },

  // === SCORPIUS - The Scorpion ===
  {
    name: 'Scorpius',
    stars: [
      { theta: 0.45, phi: 0.62, brightness: 1.0, name: 'Antares' }, // 0 - Red heart
      { theta: 0.43, phi: 0.58, brightness: 0.85, name: 'Graffias' }, // 1 - Claw
      { theta: 0.47, phi: 0.58, brightness: 0.85, name: 'Dschubba' }, // 2 - Claw
      { theta: 0.46, phi: 0.66, brightness: 0.8, name: 'Tau Sco' }, // 3
      { theta: 0.48, phi: 0.7, brightness: 0.8, name: 'Epsilon Sco' }, // 4
      { theta: 0.5, phi: 0.72, brightness: 0.85, name: 'Mu Sco' }, // 5
      { theta: 0.52, phi: 0.71, brightness: 0.9, name: 'Shaula' }, // 6 - Stinger
      { theta: 0.51, phi: 0.69, brightness: 0.8, name: 'Lesath' }, // 7
    ],
    connections: [
      [1, 0],
      [2, 0], // Claws to heart
      [0, 3],
      [3, 4],
      [4, 5],
      [5, 7],
      [7, 6], // Tail
    ],
    color: '#ff8866',
  },

  // === GEMINI - The Twins ===
  {
    name: 'Gemini',
    stars: [
      { theta: 0.15, phi: 0.38, brightness: 1.0, name: 'Castor' }, // 0
      { theta: 0.16, phi: 0.4, brightness: 0.95, name: 'Pollux' }, // 1
      { theta: 0.14, phi: 0.42, brightness: 0.75, name: 'Alhena' }, // 2
      { theta: 0.17, phi: 0.44, brightness: 0.7, name: 'Tejat' }, // 3
      { theta: 0.13, phi: 0.36, brightness: 0.7, name: 'Propus' }, // 4
      { theta: 0.18, phi: 0.38, brightness: 0.7, name: 'Mebsuta' }, // 5
    ],
    connections: [
      [0, 1], // Twin heads
      [0, 4], // Castor body
      [0, 2],
      [1, 5], // Pollux body
      [1, 3],
    ],
    color: '#ccaaff',
  },

  // === LYRA - The Lyre ===
  {
    name: 'Lyra',
    stars: [
      { theta: 0.68, phi: 0.32, brightness: 1.0, name: 'Vega' }, // 0 - Brightest
      { theta: 0.67, phi: 0.34, brightness: 0.7, name: 'Sheliak' }, // 1
      { theta: 0.69, phi: 0.34, brightness: 0.7, name: 'Sulafat' }, // 2
      { theta: 0.67, phi: 0.36, brightness: 0.65, name: 'Delta1 Lyr' }, // 3
      { theta: 0.69, phi: 0.36, brightness: 0.65, name: 'Delta2 Lyr' }, // 4
    ],
    connections: [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 4],
      [3, 4],
      [1, 2],
    ],
    color: '#88ddff',
  },

  // === AQUILA - The Eagle ===
  {
    name: 'Aquila',
    stars: [
      { theta: 0.75, phi: 0.5, brightness: 1.0, name: 'Altair' }, // 0 - Eye
      { theta: 0.73, phi: 0.48, brightness: 0.8, name: 'Tarazed' }, // 1
      { theta: 0.77, phi: 0.48, brightness: 0.75, name: 'Alshain' }, // 2
      { theta: 0.71, phi: 0.52, brightness: 0.65, name: 'Delta Aql' }, // 3 - Wing
      { theta: 0.79, phi: 0.52, brightness: 0.65, name: 'Lambda Aql' }, // 4 - Wing
    ],
    connections: [
      [1, 0],
      [0, 2], // Head line
      [3, 0],
      [0, 4], // Wings
    ],
    color: '#aaccff',
  },

  // === CORONA BOREALIS - Northern Crown ===
  {
    name: 'Corona Borealis',
    stars: [
      { theta: 0.58, phi: 0.38, brightness: 0.9, name: 'Alphecca' }, // 0 - Gem
      { theta: 0.56, phi: 0.39, brightness: 0.7 }, // 1
      { theta: 0.55, phi: 0.41, brightness: 0.65 }, // 2
      { theta: 0.56, phi: 0.43, brightness: 0.65 }, // 3
      { theta: 0.6, phi: 0.39, brightness: 0.7 }, // 4
      { theta: 0.61, phi: 0.41, brightness: 0.65 }, // 5
      { theta: 0.6, phi: 0.43, brightness: 0.65 }, // 6
    ],
    connections: [
      [1, 0],
      [0, 4],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
    ],
    color: '#ffcc88',
  },

  // === DRACO - The Dragon (partial) ===
  {
    name: 'Draco',
    stars: [
      { theta: 0.48, phi: 0.28, brightness: 0.85, name: 'Eltanin' }, // 0 - Head
      { theta: 0.5, phi: 0.3, brightness: 0.8, name: 'Rastaban' }, // 1
      { theta: 0.52, phi: 0.28, brightness: 0.7 }, // 2
      { theta: 0.54, phi: 0.26, brightness: 0.7 }, // 3
      { theta: 0.52, phi: 0.24, brightness: 0.75 }, // 4
      { theta: 0.48, phi: 0.23, brightness: 0.7 }, // 5
      { theta: 0.44, phi: 0.25, brightness: 0.7 }, // 6
    ],
    connections: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ],
    color: '#88ffaa',
  },

  // === TAURUS - The Bull (Hyades) ===
  {
    name: 'Taurus',
    stars: [
      { theta: 0.03, phi: 0.45, brightness: 1.0, name: 'Aldebaran' }, // 0 - Red eye
      { theta: 0.01, phi: 0.43, brightness: 0.8, name: 'Elnath' }, // 1 - Horn tip
      { theta: 0.05, phi: 0.42, brightness: 0.75, name: 'Zeta Tau' }, // 2 - Horn tip
      { theta: 0.02, phi: 0.46, brightness: 0.7 }, // 3 - Face
      { theta: 0.04, phi: 0.47, brightness: 0.7 }, // 4 - Face
      { theta: 0.03, phi: 0.48, brightness: 0.65 }, // 5 - Face
    ],
    connections: [
      [0, 1], // Horn
      [0, 2], // Horn
      [0, 3],
      [3, 4],
      [4, 5], // Face V
    ],
    color: '#ffaa88',
  },

  // === SOUTHERN CROSS (Crux) ===
  {
    name: 'Crux',
    stars: [
      { theta: 0.85, phi: 0.72, brightness: 0.95, name: 'Acrux' }, // 0 - Bottom
      { theta: 0.85, phi: 0.66, brightness: 0.9, name: 'Gacrux' }, // 1 - Top
      { theta: 0.83, phi: 0.69, brightness: 0.85 }, // 2 - Left
      { theta: 0.87, phi: 0.69, brightness: 0.85 }, // 3 - Right
    ],
    connections: [
      [0, 1], // Vertical
      [2, 3], // Horizontal
    ],
    color: '#aaffff',
  },
];

// Calculate total star count for instancing
export const TOTAL_CONSTELLATION_STARS = CONSTELLATIONS.reduce((sum, c) => sum + c.stars.length, 0);

// Calculate total line segments
export const TOTAL_LINE_SEGMENTS = CONSTELLATIONS.reduce((sum, c) => sum + c.connections.length, 0);
