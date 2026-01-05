/**
 * Real astronomical data for major constellations.
 *
 * Star coordinates are in J2000.0 epoch:
 * - RA (Right Ascension) in hours (0-24)
 * - Dec (Declination) in degrees (-90 to +90)
 * - Magnitude: apparent brightness (lower = brighter, negative = very bright)
 *
 * Sources:
 * - Yale Bright Star Catalogue
 * - IAU constellation boundaries
 */

export interface Star {
  id: string;
  name: string;
  ra: number; // Right Ascension in hours
  dec: number; // Declination in degrees
  magnitude: number; // Apparent magnitude (lower = brighter)
  constellation: string;
}

export interface ConstellationLine {
  constellation: string;
  from: string; // Star ID
  to: string; // Star ID
}

export interface Constellation {
  id: string;
  name: string;
  latinName: string;
  stars: string[]; // Star IDs in this constellation
}

/**
 * Major stars catalog - brightest and most recognizable stars
 * Coordinates are J2000.0 epoch
 */
export const STARS: Star[] = [
  // ========== URSA MAJOR (Big Dipper) ==========
  { id: 'dubhe', name: 'Dubhe', ra: 11.062, dec: 61.75, magnitude: 1.79, constellation: 'uma' },
  { id: 'merak', name: 'Merak', ra: 11.031, dec: 56.38, magnitude: 2.37, constellation: 'uma' },
  { id: 'phecda', name: 'Phecda', ra: 11.897, dec: 53.69, magnitude: 2.44, constellation: 'uma' },
  { id: 'megrez', name: 'Megrez', ra: 12.257, dec: 57.03, magnitude: 3.31, constellation: 'uma' },
  { id: 'alioth', name: 'Alioth', ra: 12.9, dec: 55.96, magnitude: 1.77, constellation: 'uma' },
  { id: 'mizar', name: 'Mizar', ra: 13.399, dec: 54.93, magnitude: 2.27, constellation: 'uma' },
  { id: 'alkaid', name: 'Alkaid', ra: 13.792, dec: 49.31, magnitude: 1.86, constellation: 'uma' },

  // ========== URSA MINOR (Little Dipper) ==========
  { id: 'polaris', name: 'Polaris', ra: 2.53, dec: 89.26, magnitude: 2.02, constellation: 'umi' },
  { id: 'kochab', name: 'Kochab', ra: 14.845, dec: 74.16, magnitude: 2.08, constellation: 'umi' },
  { id: 'pherkad', name: 'Pherkad', ra: 15.345, dec: 71.83, magnitude: 3.05, constellation: 'umi' },
  { id: 'yildun', name: 'Yildun', ra: 17.537, dec: 86.59, magnitude: 4.35, constellation: 'umi' },
  {
    id: 'epsilon_umi',
    name: 'Epsilon UMi',
    ra: 16.766,
    dec: 82.04,
    magnitude: 4.23,
    constellation: 'umi',
  },
  {
    id: 'zeta_umi',
    name: 'Zeta UMi',
    ra: 15.734,
    dec: 77.79,
    magnitude: 4.32,
    constellation: 'umi',
  },
  { id: 'eta_umi', name: 'Eta UMi', ra: 16.292, dec: 75.76, magnitude: 4.95, constellation: 'umi' },

  // ========== CASSIOPEIA ==========
  { id: 'schedar', name: 'Schedar', ra: 0.675, dec: 56.54, magnitude: 2.23, constellation: 'cas' },
  { id: 'caph', name: 'Caph', ra: 0.153, dec: 59.15, magnitude: 2.27, constellation: 'cas' },
  {
    id: 'gamma_cas',
    name: 'Gamma Cas',
    ra: 0.945,
    dec: 60.72,
    magnitude: 2.47,
    constellation: 'cas',
  },
  { id: 'ruchbah', name: 'Ruchbah', ra: 1.43, dec: 60.24, magnitude: 2.68, constellation: 'cas' },
  { id: 'segin', name: 'Segin', ra: 1.907, dec: 63.67, magnitude: 3.37, constellation: 'cas' },

  // ========== ORION ==========
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    ra: 5.919,
    dec: 7.41,
    magnitude: 0.5,
    constellation: 'ori',
  },
  { id: 'rigel', name: 'Rigel', ra: 5.242, dec: -8.2, magnitude: 0.13, constellation: 'ori' },
  {
    id: 'bellatrix',
    name: 'Bellatrix',
    ra: 5.419,
    dec: 6.35,
    magnitude: 1.64,
    constellation: 'ori',
  },
  { id: 'mintaka', name: 'Mintaka', ra: 5.533, dec: -0.3, magnitude: 2.23, constellation: 'ori' },
  { id: 'alnilam', name: 'Alnilam', ra: 5.603, dec: -1.2, magnitude: 1.7, constellation: 'ori' },
  { id: 'alnitak', name: 'Alnitak', ra: 5.679, dec: -1.94, magnitude: 1.77, constellation: 'ori' },
  { id: 'saiph', name: 'Saiph', ra: 5.796, dec: -9.67, magnitude: 2.09, constellation: 'ori' },

  // ========== CYGNUS (Northern Cross) ==========
  { id: 'deneb', name: 'Deneb', ra: 20.69, dec: 45.28, magnitude: 1.25, constellation: 'cyg' },
  { id: 'sadr', name: 'Sadr', ra: 20.37, dec: 40.26, magnitude: 2.2, constellation: 'cyg' },
  {
    id: 'gienah_cyg',
    name: 'Gienah',
    ra: 20.77,
    dec: 33.97,
    magnitude: 2.46,
    constellation: 'cyg',
  },
  {
    id: 'delta_cyg',
    name: 'Delta Cyg',
    ra: 19.75,
    dec: 45.13,
    magnitude: 2.87,
    constellation: 'cyg',
  },
  { id: 'albireo', name: 'Albireo', ra: 19.512, dec: 27.96, magnitude: 3.08, constellation: 'cyg' },

  // ========== LYRA ==========
  { id: 'vega', name: 'Vega', ra: 18.615, dec: 38.78, magnitude: 0.03, constellation: 'lyr' },
  { id: 'sheliak', name: 'Sheliak', ra: 18.835, dec: 33.36, magnitude: 3.52, constellation: 'lyr' },
  { id: 'sulafat', name: 'Sulafat', ra: 18.982, dec: 32.69, magnitude: 3.24, constellation: 'lyr' },
  {
    id: 'delta_lyr',
    name: 'Delta Lyr',
    ra: 18.908,
    dec: 36.9,
    magnitude: 4.3,
    constellation: 'lyr',
  },
  {
    id: 'zeta_lyr',
    name: 'Zeta Lyr',
    ra: 18.746,
    dec: 37.6,
    magnitude: 4.36,
    constellation: 'lyr',
  },

  // ========== AQUILA ==========
  { id: 'altair', name: 'Altair', ra: 19.846, dec: 8.87, magnitude: 0.77, constellation: 'aql' },
  { id: 'tarazed', name: 'Tarazed', ra: 19.771, dec: 10.61, magnitude: 2.72, constellation: 'aql' },
  { id: 'alshain', name: 'Alshain', ra: 19.922, dec: 6.41, magnitude: 3.71, constellation: 'aql' },

  // ========== LEO ==========
  { id: 'regulus', name: 'Regulus', ra: 10.139, dec: 11.97, magnitude: 1.35, constellation: 'leo' },
  {
    id: 'denebola',
    name: 'Denebola',
    ra: 11.818,
    dec: 14.57,
    magnitude: 2.14,
    constellation: 'leo',
  },
  { id: 'algieba', name: 'Algieba', ra: 10.333, dec: 19.84, magnitude: 2.28, constellation: 'leo' },
  { id: 'zosma', name: 'Zosma', ra: 11.235, dec: 20.52, magnitude: 2.56, constellation: 'leo' },
  { id: 'chertan', name: 'Chertan', ra: 11.237, dec: 15.43, magnitude: 3.34, constellation: 'leo' },
  { id: 'eta_leo', name: 'Eta Leo', ra: 10.122, dec: 16.76, magnitude: 3.52, constellation: 'leo' },

  // ========== SCORPIUS ==========
  { id: 'antares', name: 'Antares', ra: 16.49, dec: -26.43, magnitude: 0.96, constellation: 'sco' },
  { id: 'shaula', name: 'Shaula', ra: 17.56, dec: -37.1, magnitude: 1.63, constellation: 'sco' },
  { id: 'sargas', name: 'Sargas', ra: 17.622, dec: -42.99, magnitude: 1.87, constellation: 'sco' },
  {
    id: 'dschubba',
    name: 'Dschubba',
    ra: 16.005,
    dec: -22.62,
    magnitude: 2.32,
    constellation: 'sco',
  },
  {
    id: 'graffias',
    name: 'Graffias',
    ra: 16.092,
    dec: -19.81,
    magnitude: 2.62,
    constellation: 'sco',
  },
  { id: 'lesath', name: 'Lesath', ra: 17.53, dec: -37.29, magnitude: 2.69, constellation: 'sco' },

  // ========== GEMINI ==========
  { id: 'castor', name: 'Castor', ra: 7.577, dec: 31.89, magnitude: 1.58, constellation: 'gem' },
  { id: 'pollux', name: 'Pollux', ra: 7.755, dec: 28.03, magnitude: 1.14, constellation: 'gem' },
  { id: 'alhena', name: 'Alhena', ra: 6.629, dec: 16.4, magnitude: 1.93, constellation: 'gem' },
  { id: 'wasat', name: 'Wasat', ra: 7.068, dec: 21.98, magnitude: 3.53, constellation: 'gem' },
  { id: 'mebsuta', name: 'Mebsuta', ra: 6.732, dec: 25.13, magnitude: 2.98, constellation: 'gem' },
  { id: 'tejat', name: 'Tejat', ra: 6.383, dec: 22.51, magnitude: 2.88, constellation: 'gem' },

  // ========== TAURUS ==========
  {
    id: 'aldebaran',
    name: 'Aldebaran',
    ra: 4.599,
    dec: 16.51,
    magnitude: 0.85,
    constellation: 'tau',
  },
  { id: 'elnath', name: 'Elnath', ra: 5.438, dec: 28.61, magnitude: 1.65, constellation: 'tau' },
  { id: 'alcyone', name: 'Alcyone', ra: 3.791, dec: 24.11, magnitude: 2.87, constellation: 'tau' },
  { id: 'zeta_tau', name: 'Zeta Tau', ra: 5.627, dec: 21.14, magnitude: 3.0, constellation: 'tau' },

  // ========== CANIS MAJOR ==========
  { id: 'sirius', name: 'Sirius', ra: 6.752, dec: -16.72, magnitude: -1.46, constellation: 'cma' },
  { id: 'adhara', name: 'Adhara', ra: 6.977, dec: -28.97, magnitude: 1.5, constellation: 'cma' },
  { id: 'wezen', name: 'Wezen', ra: 7.14, dec: -26.39, magnitude: 1.84, constellation: 'cma' },
  { id: 'mirzam', name: 'Mirzam', ra: 6.378, dec: -17.96, magnitude: 1.98, constellation: 'cma' },
  { id: 'aludra', name: 'Aludra', ra: 7.402, dec: -29.3, magnitude: 2.45, constellation: 'cma' },

  // ========== CANIS MINOR ==========
  { id: 'procyon', name: 'Procyon', ra: 7.655, dec: 5.22, magnitude: 0.34, constellation: 'cmi' },
  { id: 'gomeisa', name: 'Gomeisa', ra: 7.453, dec: 8.29, magnitude: 2.9, constellation: 'cmi' },

  // ========== BOOTES ==========
  {
    id: 'arcturus',
    name: 'Arcturus',
    ra: 14.261,
    dec: 19.18,
    magnitude: -0.05,
    constellation: 'boo',
  },
  { id: 'izar', name: 'Izar', ra: 14.75, dec: 27.07, magnitude: 2.37, constellation: 'boo' },
  { id: 'muphrid', name: 'Muphrid', ra: 13.911, dec: 18.4, magnitude: 2.68, constellation: 'boo' },
  { id: 'nekkar', name: 'Nekkar', ra: 15.032, dec: 40.39, magnitude: 3.5, constellation: 'boo' },
  { id: 'seginus', name: 'Seginus', ra: 14.535, dec: 38.31, magnitude: 3.03, constellation: 'boo' },

  // ========== VIRGO ==========
  { id: 'spica', name: 'Spica', ra: 13.42, dec: -11.16, magnitude: 0.97, constellation: 'vir' },
  {
    id: 'vindemiatrix',
    name: 'Vindemiatrix',
    ra: 13.036,
    dec: 10.96,
    magnitude: 2.83,
    constellation: 'vir',
  },
  { id: 'porrima', name: 'Porrima', ra: 12.694, dec: -1.45, magnitude: 2.74, constellation: 'vir' },

  // ========== PEGASUS ==========
  { id: 'markab', name: 'Markab', ra: 23.079, dec: 15.21, magnitude: 2.49, constellation: 'peg' },
  { id: 'scheat', name: 'Scheat', ra: 23.063, dec: 28.08, magnitude: 2.42, constellation: 'peg' },
  { id: 'algenib', name: 'Algenib', ra: 0.22, dec: 15.18, magnitude: 2.83, constellation: 'peg' },
  { id: 'enif', name: 'Enif', ra: 21.736, dec: 9.87, magnitude: 2.39, constellation: 'peg' },

  // ========== ANDROMEDA ==========
  {
    id: 'alpheratz',
    name: 'Alpheratz',
    ra: 0.14,
    dec: 29.09,
    magnitude: 2.06,
    constellation: 'and',
  },
  { id: 'mirach', name: 'Mirach', ra: 1.162, dec: 35.62, magnitude: 2.05, constellation: 'and' },
  { id: 'almach', name: 'Almach', ra: 2.065, dec: 42.33, magnitude: 2.1, constellation: 'and' },

  // ========== CORONA BOREALIS ==========
  {
    id: 'alphecca',
    name: 'Alphecca',
    ra: 15.578,
    dec: 26.71,
    magnitude: 2.23,
    constellation: 'crb',
  },
  { id: 'nusakan', name: 'Nusakan', ra: 15.464, dec: 29.11, magnitude: 3.68, constellation: 'crb' },
  {
    id: 'theta_crb',
    name: 'Theta CrB',
    ra: 15.549,
    dec: 31.36,
    magnitude: 4.14,
    constellation: 'crb',
  },
  {
    id: 'gamma_crb',
    name: 'Gamma CrB',
    ra: 15.712,
    dec: 26.3,
    magnitude: 3.84,
    constellation: 'crb',
  },
  {
    id: 'delta_crb',
    name: 'Delta CrB',
    ra: 15.826,
    dec: 26.07,
    magnitude: 4.63,
    constellation: 'crb',
  },
  {
    id: 'epsilon_crb',
    name: 'Epsilon CrB',
    ra: 15.959,
    dec: 26.88,
    magnitude: 4.15,
    constellation: 'crb',
  },
];

/**
 * Constellation line patterns - which stars to connect
 */
export const CONSTELLATION_LINES: ConstellationLine[] = [
  // URSA MAJOR (Big Dipper)
  { constellation: 'uma', from: 'dubhe', to: 'merak' },
  { constellation: 'uma', from: 'merak', to: 'phecda' },
  { constellation: 'uma', from: 'phecda', to: 'megrez' },
  { constellation: 'uma', from: 'megrez', to: 'dubhe' },
  { constellation: 'uma', from: 'megrez', to: 'alioth' },
  { constellation: 'uma', from: 'alioth', to: 'mizar' },
  { constellation: 'uma', from: 'mizar', to: 'alkaid' },

  // URSA MINOR (Little Dipper)
  { constellation: 'umi', from: 'polaris', to: 'yildun' },
  { constellation: 'umi', from: 'yildun', to: 'epsilon_umi' },
  { constellation: 'umi', from: 'epsilon_umi', to: 'zeta_umi' },
  { constellation: 'umi', from: 'zeta_umi', to: 'eta_umi' },
  { constellation: 'umi', from: 'eta_umi', to: 'pherkad' },
  { constellation: 'umi', from: 'pherkad', to: 'kochab' },
  { constellation: 'umi', from: 'kochab', to: 'zeta_umi' },

  // CASSIOPEIA (W shape)
  { constellation: 'cas', from: 'caph', to: 'schedar' },
  { constellation: 'cas', from: 'schedar', to: 'gamma_cas' },
  { constellation: 'cas', from: 'gamma_cas', to: 'ruchbah' },
  { constellation: 'cas', from: 'ruchbah', to: 'segin' },

  // ORION
  { constellation: 'ori', from: 'betelgeuse', to: 'bellatrix' },
  { constellation: 'ori', from: 'bellatrix', to: 'mintaka' },
  { constellation: 'ori', from: 'mintaka', to: 'alnilam' },
  { constellation: 'ori', from: 'alnilam', to: 'alnitak' },
  { constellation: 'ori', from: 'alnitak', to: 'saiph' },
  { constellation: 'ori', from: 'saiph', to: 'rigel' },
  { constellation: 'ori', from: 'rigel', to: 'mintaka' },
  { constellation: 'ori', from: 'betelgeuse', to: 'alnitak' },

  // CYGNUS (Northern Cross)
  { constellation: 'cyg', from: 'deneb', to: 'sadr' },
  { constellation: 'cyg', from: 'sadr', to: 'albireo' },
  { constellation: 'cyg', from: 'sadr', to: 'gienah_cyg' },
  { constellation: 'cyg', from: 'sadr', to: 'delta_cyg' },

  // LYRA
  { constellation: 'lyr', from: 'vega', to: 'zeta_lyr' },
  { constellation: 'lyr', from: 'zeta_lyr', to: 'delta_lyr' },
  { constellation: 'lyr', from: 'delta_lyr', to: 'sulafat' },
  { constellation: 'lyr', from: 'sulafat', to: 'sheliak' },
  { constellation: 'lyr', from: 'sheliak', to: 'zeta_lyr' },

  // AQUILA
  { constellation: 'aql', from: 'tarazed', to: 'altair' },
  { constellation: 'aql', from: 'altair', to: 'alshain' },

  // LEO
  { constellation: 'leo', from: 'regulus', to: 'eta_leo' },
  { constellation: 'leo', from: 'eta_leo', to: 'algieba' },
  { constellation: 'leo', from: 'algieba', to: 'zosma' },
  { constellation: 'leo', from: 'zosma', to: 'denebola' },
  { constellation: 'leo', from: 'zosma', to: 'chertan' },
  { constellation: 'leo', from: 'chertan', to: 'regulus' },

  // SCORPIUS (simplified - head and stinger)
  { constellation: 'sco', from: 'graffias', to: 'dschubba' },
  { constellation: 'sco', from: 'dschubba', to: 'antares' },
  { constellation: 'sco', from: 'antares', to: 'shaula' },
  { constellation: 'sco', from: 'shaula', to: 'lesath' },
  { constellation: 'sco', from: 'shaula', to: 'sargas' },

  // GEMINI
  { constellation: 'gem', from: 'castor', to: 'pollux' },
  { constellation: 'gem', from: 'pollux', to: 'wasat' },
  { constellation: 'gem', from: 'wasat', to: 'alhena' },
  { constellation: 'gem', from: 'castor', to: 'mebsuta' },
  { constellation: 'gem', from: 'mebsuta', to: 'tejat' },

  // TAURUS
  { constellation: 'tau', from: 'aldebaran', to: 'elnath' },
  { constellation: 'tau', from: 'aldebaran', to: 'zeta_tau' },
  { constellation: 'tau', from: 'alcyone', to: 'aldebaran' },

  // CANIS MAJOR
  { constellation: 'cma', from: 'sirius', to: 'mirzam' },
  { constellation: 'cma', from: 'sirius', to: 'adhara' },
  { constellation: 'cma', from: 'adhara', to: 'wezen' },
  { constellation: 'cma', from: 'wezen', to: 'aludra' },

  // CANIS MINOR
  { constellation: 'cmi', from: 'procyon', to: 'gomeisa' },

  // BOOTES
  { constellation: 'boo', from: 'arcturus', to: 'muphrid' },
  { constellation: 'boo', from: 'arcturus', to: 'izar' },
  { constellation: 'boo', from: 'izar', to: 'seginus' },
  { constellation: 'boo', from: 'seginus', to: 'nekkar' },

  // VIRGO
  { constellation: 'vir', from: 'spica', to: 'porrima' },
  { constellation: 'vir', from: 'porrima', to: 'vindemiatrix' },

  // PEGASUS (Great Square)
  { constellation: 'peg', from: 'markab', to: 'scheat' },
  { constellation: 'peg', from: 'scheat', to: 'alpheratz' },
  { constellation: 'peg', from: 'alpheratz', to: 'algenib' },
  { constellation: 'peg', from: 'algenib', to: 'markab' },
  { constellation: 'peg', from: 'markab', to: 'enif' },

  // ANDROMEDA
  { constellation: 'and', from: 'alpheratz', to: 'mirach' },
  { constellation: 'and', from: 'mirach', to: 'almach' },

  // CORONA BOREALIS (crown arc)
  { constellation: 'crb', from: 'theta_crb', to: 'nusakan' },
  { constellation: 'crb', from: 'nusakan', to: 'alphecca' },
  { constellation: 'crb', from: 'alphecca', to: 'gamma_crb' },
  { constellation: 'crb', from: 'gamma_crb', to: 'delta_crb' },
  { constellation: 'crb', from: 'delta_crb', to: 'epsilon_crb' },
];

/**
 * Constellation metadata
 */
export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'uma',
    name: 'Big Dipper',
    latinName: 'Ursa Major',
    stars: ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid'],
  },
  {
    id: 'umi',
    name: 'Little Dipper',
    latinName: 'Ursa Minor',
    stars: ['polaris', 'kochab', 'pherkad', 'yildun', 'epsilon_umi', 'zeta_umi', 'eta_umi'],
  },
  {
    id: 'cas',
    name: 'Cassiopeia',
    latinName: 'Cassiopeia',
    stars: ['schedar', 'caph', 'gamma_cas', 'ruchbah', 'segin'],
  },
  {
    id: 'ori',
    name: 'Orion',
    latinName: 'Orion',
    stars: ['betelgeuse', 'rigel', 'bellatrix', 'mintaka', 'alnilam', 'alnitak', 'saiph'],
  },
  {
    id: 'cyg',
    name: 'Northern Cross',
    latinName: 'Cygnus',
    stars: ['deneb', 'sadr', 'gienah_cyg', 'delta_cyg', 'albireo'],
  },
  {
    id: 'lyr',
    name: 'Lyra',
    latinName: 'Lyra',
    stars: ['vega', 'sheliak', 'sulafat', 'delta_lyr', 'zeta_lyr'],
  },
  {
    id: 'aql',
    name: 'Eagle',
    latinName: 'Aquila',
    stars: ['altair', 'tarazed', 'alshain'],
  },
  {
    id: 'leo',
    name: 'Lion',
    latinName: 'Leo',
    stars: ['regulus', 'denebola', 'algieba', 'zosma', 'chertan', 'eta_leo'],
  },
  {
    id: 'sco',
    name: 'Scorpion',
    latinName: 'Scorpius',
    stars: ['antares', 'shaula', 'sargas', 'dschubba', 'graffias', 'lesath'],
  },
  {
    id: 'gem',
    name: 'Twins',
    latinName: 'Gemini',
    stars: ['castor', 'pollux', 'alhena', 'wasat', 'mebsuta', 'tejat'],
  },
  {
    id: 'tau',
    name: 'Bull',
    latinName: 'Taurus',
    stars: ['aldebaran', 'elnath', 'alcyone', 'zeta_tau'],
  },
  {
    id: 'cma',
    name: 'Great Dog',
    latinName: 'Canis Major',
    stars: ['sirius', 'adhara', 'wezen', 'mirzam', 'aludra'],
  },
  {
    id: 'cmi',
    name: 'Little Dog',
    latinName: 'Canis Minor',
    stars: ['procyon', 'gomeisa'],
  },
  {
    id: 'boo',
    name: 'Herdsman',
    latinName: 'Bootes',
    stars: ['arcturus', 'izar', 'muphrid', 'nekkar', 'seginus'],
  },
  {
    id: 'vir',
    name: 'Maiden',
    latinName: 'Virgo',
    stars: ['spica', 'vindemiatrix', 'porrima'],
  },
  {
    id: 'peg',
    name: 'Winged Horse',
    latinName: 'Pegasus',
    stars: ['markab', 'scheat', 'algenib', 'enif'],
  },
  {
    id: 'and',
    name: 'Princess',
    latinName: 'Andromeda',
    stars: ['alpheratz', 'mirach', 'almach'],
  },
  {
    id: 'crb',
    name: 'Northern Crown',
    latinName: 'Corona Borealis',
    stars: ['alphecca', 'nusakan', 'theta_crb', 'gamma_crb', 'delta_crb', 'epsilon_crb'],
  },
];

/**
 * Helper: Get star by ID
 */
export function getStarById(id: string): Star | undefined {
  return STARS.find((s) => s.id === id);
}

/**
 * Helper: Get all stars in a constellation
 */
export function getConstellationStars(constellationId: string): Star[] {
  return STARS.filter((s) => s.constellation === constellationId);
}

/**
 * Helper: Get constellation lines
 */
export function getConstellationLines(constellationId: string): ConstellationLine[] {
  return CONSTELLATION_LINES.filter((l) => l.constellation === constellationId);
}

/**
 * Helper: Convert magnitude to visual brightness (0-1 scale)
 * Lower magnitude = brighter star
 * Range: -1.46 (Sirius) to ~5 (barely visible)
 */
export function magnitudeToBrightness(magnitude: number): number {
  // Normalize: mag -1.5 → 1.0, mag 5 → 0.1
  const normalized = 1 - (magnitude + 1.5) / 6.5;
  return Math.max(0.1, Math.min(1, normalized));
}

/**
 * Helper: Convert magnitude to star size
 */
export function magnitudeToSize(magnitude: number, baseSize: number = 0.3): number {
  const brightness = magnitudeToBrightness(magnitude);
  return baseSize * (0.5 + brightness * 1.5);
}
