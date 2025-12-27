import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useRef } from 'react';

export function CameraRig() {
	const { camera, mouse } = useThree();
	const targetPosition = useRef(new THREE.Vector3(0, 0, 10));
	const currentPosition = useRef(new THREE.Vector3(0, 0, 10));

	useFrame((_state, delta) => {
		// Calculate target position based on mouse
		// Subtle movement: +/- 0.5 units
		targetPosition.current.set(mouse.x * 0.5, mouse.y * 0.5, 10);

		// Smoothly interpolate camera position
		// Clamp alpha to 1 to prevent overshooting on frame jumps
		currentPosition.current.lerp(targetPosition.current, Math.min(delta * 2, 1));
		camera.position.copy(currentPosition.current);

		// Always look at center
		camera.lookAt(0, 0, 0);
	});

	return null;
}
