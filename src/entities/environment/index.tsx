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
	 * Stars sphere radius
	 * @min 50
	 * @max 200
	 * @step 10
	 */
	starsRadius?: number;

	/**
	 * Stars depth (affects fade)
	 * @min 10
	 * @max 100
	 * @step 5
	 */
	starsDepth?: number;

	/**
	 * Number of stars
	 * @min 1000
	 * @max 10000
	 * @step 500
	 */
	starsCount?: number;

	/**
	 * Stars size factor
	 * @min 1
	 * @max 10
	 * @step 0.5
	 */
	starsFactor?: number;

	/**
	 * Point light position
	 * @type vector3
	 */
	lightPosition?: [number, number, number];

	/**
	 * Point light color
	 * @type color
	 */
	lightColor?: string;

	/**
	 * Point light distance
	 * @min 5
	 * @max 50
	 * @step 1
	 */
	lightDistance?: number;

	/**
	 * Point light decay
	 * @min 0
	 * @max 4
	 * @step 0.1
	 */
	lightDecay?: number;

	/**
	 * Point light minimum intensity
	 * @min 0
	 * @max 5
	 * @step 0.1
	 */
	lightIntensityMin?: number;

	/**
	 * Point light intensity range (breathing modulation)
	 * @min 0
	 * @max 5
	 * @step 0.1
	 */
	lightIntensityRange?: number;

	/**
	 * Floor Y position
	 * @min -10
	 * @max 0
	 * @step 0.5
	 */
	floorPositionY?: number;

	/**
	 * Floor size (width and depth)
	 * @min 50
	 * @max 200
	 * @step 10
	 */
	floorSize?: number;

	/**
	 * Floor color
	 * @type color
	 */
	floorColor?: string;

	/**
	 * Floor opacity
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	floorOpacity?: number;

	/**
	 * Floor material roughness
	 * @min 0
	 * @max 1
	 * @step 0.1
	 */
	floorRoughness?: number;

	/**
	 * Floor material metalness
	 * @min 0
	 * @max 1
	 * @step 0.1
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
