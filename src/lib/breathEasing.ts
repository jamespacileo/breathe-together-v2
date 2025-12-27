/**
 * Organic easing curves for breathing animation
 * Creates natural, asymmetric motion for particles and sphere
 *
 * Philosophy:
 * - Particles: Wind-like acceleration (leaves being picked up and dropped)
 * - Sphere: Balloon-like inflation/deflation with volume-aware momentum
 * - Asymmetric: Different curves for inhale vs exhale to feel more organic
 */

/**
 * Particle exhale: Wind picking up leaves and carrying them outward
 *
 * Motion: Quick acceleration → sustained outward motion → gentle settling
 *
 * Easing curve: Ease-out-cubic with modified coefficient (power 2.5)
 * Creates the feeling of wind gust picking up particles and gradually releasing them
 *
 * @param t Phase progress from 0 to 1 (exhale goes 1→0, we normalize it)
 * @returns Eased phase value
 */
export const particleExhaleEase = (t: number): number => {
	const normalized = 1 - t;
	return 1 - (1 - Math.pow(1 - normalized, 2.5));
};

/**
 * Particle inhale: Particles pulled inward toward center
 *
 * Motion: Slow start → acceleration → quick final finish
 *
 * Easing curve: Ease-in-cubic with modified coefficient (power 2.2)
 * Creates the feeling of particles being drawn inward with increasing force
 *
 * @param t Phase progress from 0 to 1
 * @returns Eased phase value
 */
export const particleInhaleEase = (t: number): number => {
	return Math.pow(t, 2.2);
};

/**
 * Sphere inhale: Balloon inflating with air pressure
 *
 * Motion: Resistance → rapid expansion → gentle settling at peak
 *
 * Easing curve: Piecewise custom curve accounting for volume momentum
 * - Early (0-10%): Very slow start as balloon skin resists stretch
 * - Middle (10-80%): Rapid expansion as air flows in more freely
 * - Late (80-100%): Gentle settling as pressure equalizes at peak
 *
 * @param t Phase progress from 0 to 1
 * @returns Eased phase value
 */
export const sphereInhaleEase = (t: number): number => {
	if (t < 0.1) {
		// Very slow start (resistance phase)
		// Quadratic ease-in: resistance to initial inflation
		return 2 * t * t;
	} else if (t < 0.8) {
		// Accelerated middle section (expansion phase)
		// Ease-out-quad: rapid expansion as air flows in
		const adjusted = (t - 0.1) / 0.7;
		return 0.02 + 0.78 * (1 - Math.pow(1 - adjusted, 2));
	} else {
		// Gentle settling at peak (equilibrium phase)
		// Ease-out power 1.5: natural settling to final size
		const adjusted = (t - 0.8) / 0.2;
		return 0.8 + 0.2 * (1 - Math.pow(1 - adjusted, 1.5));
	}
};

/**
 * Sphere exhale: Balloon deflating with elastic recoil
 *
 * Motion: Quick release → gradual deceleration → gentle finish
 *
 * Easing curve: Ease-out with modified power (1.8)
 * Creates the feeling of air rapidly escaping then pressure gradually equalizing
 * as the sphere contracts back to resting state
 *
 * @param t Phase progress from 0 to 1 (exhale goes 1→0, we normalize it)
 * @returns Eased phase value
 */
export const sphereExhaleEase = (t: number): number => {
	const normalized = 1 - t;
	// Steep initial descent then gentle finish
	return 1 - (1 - Math.pow(normalized, 1.8));
};
