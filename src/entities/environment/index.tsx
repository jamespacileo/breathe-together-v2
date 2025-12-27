import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { useWorld } from 'koota/react';
import { breathPhase } from '../breath/traits';
import { VISUALS } from '../../constants';

export function Environment() {
	const lightRef = useRef<THREE.PointLight>(null);
	const world = useWorld();

	useFrame(() => {
		if (!lightRef.current) return;

		// Get breath phase to pulse light
		const breathEntity = world.queryFirst(breathPhase);
		const phase = breathEntity?.get(breathPhase)?.value ?? 0;

		// Pulse intensity between 0.5 and 2.0
		lightRef.current.intensity = 0.5 + phase * 1.5;
	});

	return (
		<>
			{/* Deep space background */}
			<Stars
				radius={100}
				depth={50}
				count={5000}
				factor={4}
				saturation={0}
				fade
				speed={1}
			/>

			{/* Dynamic point light that pulses with breath */}
			<pointLight
				ref={lightRef}
				position={[0, 5, 5]}
				color={VISUALS.SPHERE_COLOR_INHALE}
				distance={20}
				decay={2}
			/>

			{/* Subtle floor to give sense of scale and position */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} receiveShadow>
				<planeGeometry args={[100, 100]} />
				<meshStandardMaterial
					color="#0a0a1a"
					transparent
					opacity={0.4}
					roughness={1}
					metalness={0}
				/>
			</mesh>
		</>
	);
}
