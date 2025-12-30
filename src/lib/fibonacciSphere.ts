/**
 * Fibonacci sphere distribution
 * Generates evenly distributed points on a sphere
 * Useful for particle systems that need uniform coverage
 */

export interface FibonacciPoint {
  theta: number; // Longitude (0 to 2π)
  phi: number; // Latitude (0 to π)
  orbitSpeed: number; // Random multiplier [0.7, 1.3]
  size: number; // Random multiplier [0.8, 1.4]
}

/**
 * Generate evenly distributed points on a sphere using Fibonacci spiral
 * @param count Number of points to generate
 * @returns Array of points with spherical coordinates and animation params
 */
export function generateFibonacciSphere(count: number): FibonacciPoint[] {
  const points: FibonacciPoint[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    // Y coordinate ranges from 1 to -1 (top to bottom)
    const y = 1 - (i / (count - 1)) * 2;

    // Radius at this height
    const _radius = Math.sqrt(1 - y * y);

    // Distribute around the circle using golden ratio
    const theta = (2 * Math.PI * i) / goldenRatio;

    // Convert y to latitude angle
    const phi = Math.acos(y);

    points.push({
      theta,
      phi,
      // Vary orbit speed slightly for visual variety
      orbitSpeed: 0.7 + Math.random() * 0.6,
      // Vary size slightly for visual variety
      size: 0.8 + Math.random() * 0.6,
    });
  }

  return points;
}
