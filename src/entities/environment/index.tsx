/**
 * Environment - Space background with stars and dynamic lighting
 * Stars fade with depth, pulsing point light syncs with breath phase
 */
import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { useWorld } from 'koota/react';
import { breathPhase } from '../breath/traits';
import { VISUALS } from '../../constants';

interface EnvironmentProps {
	/**
	 * Stars sphere radius (size of starfield sphere).
	 *
	 * Controls how far away the stars appear. Larger values push stars further.
	 *
	 * **When to adjust:** 50-80 for intimate setting, 100+ for vast space
	 * **Typical range:** Close (50, intimate) → Standard (100, balanced) → Far (150, vast) → Distant (200, space)
	 * **Performance note:** No impact; stars are computed in shader
	 *
	 * @min 50
	 * @max 200
	 * @step 10
	 * @default 100
	 */
	starsRadius?: number;

	/**
	 * Stars depth fade range (how quickly distant stars fade).
	 *
	 * Controls depth-of-field effect. Lower values fade stars quickly, higher keep them visible.
	 *
	 * **When to adjust:** 20-30 for quick fade (focus on sphere), 60-100 for visible starfield
	 * **Typical range:** Quick (20, focus) → Moderate (50, balanced) → Slow (80, deep field)
	 *
	 * @min 10
	 * @max 100
	 * @step 5
	 * @default 50
	 */
	starsDepth?: number;

	/**
	 * Number of stars in starfield (particle count).
	 *
	 * Higher values create denser starfield but increase memory and computation.
	 *
	 * **When to adjust:** 1000-3000 for sparse (fast), 5000 for standard, 8000+ for dense
	 * **Typical range:** Sparse (1000, individual stars) → Standard (5000, balanced) → Dense (10000, full field)
	 * **Performance note:** Linear impact on initialization; no runtime cost after creation
	 *
	 * @min 1000
	 * @max 10000
	 * @step 500
	 * @default 5000
	 */
	starsCount?: number;

	/**
	 * Stars size multiplier (individual star size).
	 *
	 * Scales the size of individual star particles.
	 *
	 * **When to adjust:** 1-2 for small pinprick stars, 4-6 for visible stars, 8+ for large stars
	 * **Typical range:** Tiny (1, pinpricks) → Standard (4, visible) → Large (8, prominent) → Huge (10, bright)
	 *
	 * @min 1
	 * @max 10
	 * @step 0.5
	 * @default 4
	 */
	starsFactor?: number;

	/**
	 * Ambient point light position in 3D space.
	 *
	 * Where a secondary pulsing point light is positioned for environmental illumination.
	 *
	 * **When to adjust:** [0, 5, 5] for above-front, [0, -5, 0] for below, [10, 0, 0] for side
	 * **Typical range:** Above front ([0, 5, 5]) → Center ([0, 0, 0]) → Below ([0, -5, 0])
	 * **Interacts with:** lightColor, lightIntensityMin, lightIntensityRange
	 *
	 * @type vector3
	 * @default [0, 5, 5]
	 */
	lightPosition?: [number, number, number];

	/**
	 * Ambient point light color.
	 *
	 * Tints the environmental light. Usually matches or complements scene theme.
	 *
	 * **When to adjust:** Cyan for cool aesthetic, orange for warm, neutral white
	 * **Typical range:** Cool (#4080ff) → Neutral (#ffffff) → Warm (#ff9900)
	 * **Interacts with:** lightIntensityRange (color saturation)
	 *
	 * @type color
	 * @default "#4dd9e8"
	 */
	lightColor?: string;

	/**
	 * Point light decay distance (how far light reaches).
	 *
	 * Controls falloff: 0 = infinite range, >1 = limited range.
	 *
	 * **When to adjust:** 10-15 for close intimate light, 20-30 for broad illumination
	 * **Typical range:** Close (5, immediate) → Moderate (20, standard) → Far (50, broad)
	 *
	 * @min 5
	 * @max 50
	 * @step 1
	 * @default 20
	 */
	lightDistance?: number;

	/**
	 * Point light decay rate (attenuation formula).
	 *
	 * Higher values decay light more quickly with distance (1/r^decay).
	 *
	 * **When to adjust:** 0-1 for flat/distant light, 2-3 for natural falloff, 4 for very localized
	 * **Typical range:** Flat (0.5) → Natural (2, default) → Localized (3.5) → Very localized (4)
	 *
	 * @min 0
	 * @max 4
	 * @step 0.1
	 * @default 2
	 */
	lightDecay?: number;

	/**
	 * Point light base intensity (non-breathing).
	 *
	 * Minimum light brightness. Breathes up by lightIntensityRange.
	 *
	 * **When to adjust:** 0.2-0.5 for subtle glow, 0.8-1.5 for prominent, 2.0+ for bright
	 * **Typical range:** Subtle (0.2) → Standard (0.5, default) → Prominent (1.0) → Bright (2.0+)
	 * **Interacts with:** lightIntensityRange (adds to base)
	 *
	 * @min 0
	 * @max 5
	 * @step 0.1
	 * @default 0.5
	 */
	lightIntensityMin?: number;

	/**
	 * Point light breathing modulation range.
	 *
	 * How much intensity changes with breathing cycle. Creates pulsing ambient light effect.
	 *
	 * **When to adjust:** 0.5-1.0 for subtle breathing, 1.5-2.5 for pronounced pulse
	 * **Typical range:** Subtle (0.5) → Moderate (1.5, default) → Strong (2.5) → Extreme (3.0+)
	 *
	 * @min 0
	 * @max 5
	 * @step 0.1
	 * @default 1.5
	 */
	lightIntensityRange?: number;

	/**
	 * Floor plane Y position (vertical placement).
	 *
	 * Controls height of the ground plane relative to scene center.
	 *
	 * **When to adjust:** -6 to -2 (below sphere), 0 (at center), 2+ (above)
	 * **Typical range:** Below (-6) → Standard (-4, default) → Near (-2) → Above (2)
	 *
	 * @min -10
	 * @max 0
	 * @step 0.5
	 * @default -4
	 */
	floorPositionY?: number;

	/**
	 * Floor plane size (width and depth in world units).
	 *
	 * Larger values create bigger floor plane.
	 *
	 * **When to adjust:** 50-75 for tight fit, 100+ for spacious surroundings
	 * **Typical range:** Small (50) → Standard (100, default) → Large (150) → Vast (200)
	 *
	 * @min 50
	 * @max 200
	 * @step 10
	 * @default 100
	 */
	floorSize?: number;

	/**
	 * Floor plane color.
	 *
	 * Tints the ground plane. Usually dark to avoid distraction.
	 *
	 * **When to adjust:** Dark (#0a0a1a) to recede, lighter shades for visibility
	 * **Typical range:** Very dark (#000000) → Dark (#0a0a1a, default) → Medium (#333333)
	 * **Interacts with:** backgroundColor (should coordinate)
	 *
	 * @type color
	 * @default "#0a0a1a"
	 */
	floorColor?: string;

	/**
	 * Floor material transparency (alpha blending).
	 *
	 * Controls how translucent the floor appears (0 = invisible, 1 = opaque).
	 *
	 * **When to adjust:** 0.0-0.3 for ghost-like floor, 0.5-0.8 for visible, 1.0 for solid
	 * **Typical range:** Invisible (0.0) → Ghost (0.2) → Visible (0.5) → Opaque (1.0)
	 *
	 * @min 0
	 * @max 1
	 * @step 0.05
	 * @default 0.5
	 */
	floorOpacity?: number;

	/**
	 * Floor material roughness (surface finish).
	 *
	 * Controls reflectivity: 0 = mirror-like (reflective), 1 = completely diffuse (matte).
	 *
	 * **When to adjust:** 0.3-0.5 for smooth/polished, 0.7-1.0 for rough/matte
	 * **Typical range:** Smooth (0.3) → Balanced (0.6, default) → Rough (0.8) → Very rough (1.0)
	 *
	 * @min 0
	 * @max 1
	 * @step 0.1
	 * @default 0.6
	 */
	floorRoughness?: number;

	/**
	 * Floor material metalness (metallic appearance).
	 *
	 * Controls how much floor behaves like metal: 0 = dielectric (normal), 1 = full metal (reflective).
	 *
	 * **When to adjust:** 0.0 for non-metallic, 0.3-0.7 for slight metal, 0.8+ for polished metal
	 * **Typical range:** Non-metal (0.0) → Slight metal (0.3) → Metal (0.6) → Full metal (1.0)
	 *
	 * @min 0
	 * @max 1
	 * @step 0.1
	 * @default 0.2
	 */
	floorMetalness?: number;
}

export function Environment({
	starsRadius = 100,
	starsDepth = 50,
	starsCount = 5000,
	starsFactor = 4,
	lightPosition = [0, 5, 5],
	lightColor = VISUALS.SPHERE_COLOR_INHALE,
	lightDistance = 20,
	lightDecay = 2,
	lightIntensityMin = 0.5,
	lightIntensityRange = 1.5,
	floorPositionY = -4,
	floorSize = 100,
	floorColor = '#0a0a1a',
	floorOpacity = 0.4,
	floorRoughness = 1,
	floorMetalness = 0,
}: EnvironmentProps = {}) {
	const lightRef = useRef<THREE.PointLight>(null);
	const world = useWorld();

	useFrame(() => {
		if (!lightRef.current) return;

		// Get breath phase to pulse light
		const breathEntity = world.queryFirst(breathPhase);
		const phase = breathEntity?.get(breathPhase)?.value ?? 0;

		// Pulse intensity between lightIntensityMin and lightIntensityMax
		lightRef.current.intensity = lightIntensityMin + phase * lightIntensityRange;
	});

	return (
		<>
			{/* Deep space background */}
			<Stars
				radius={starsRadius}
				depth={starsDepth}
				count={starsCount}
				factor={starsFactor}
				saturation={0}
				fade
				speed={1}
			/>

			{/* Dynamic point light that pulses with breath */}
			<pointLight
				ref={lightRef}
				position={lightPosition}
				color={lightColor}
				distance={lightDistance}
				decay={lightDecay}
			/>

			{/* Subtle floor to give sense of scale and position */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorPositionY, 0]} receiveShadow>
				<planeGeometry args={[floorSize, floorSize]} />
				<meshStandardMaterial
					color={floorColor}
					transparent
					opacity={floorOpacity}
					roughness={floorRoughness}
					metalness={floorMetalness}
				/>
			</mesh>
		</>
	);
}
