import * as THREE from 'three';

export const FRESNEL_VERTEX_SHADER = `
	varying vec3 vNormal;
	varying vec3 vWorldPosition;
	varying float vNoise;
	uniform float uTime;
	uniform float uNoiseIntensity;
	uniform float uBreathPhase;

	// Simple 3D Noise function (Simplex-like)
	vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
	vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
	vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
	float snoise(vec3 v) {
		const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
		const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
		vec3 i  = floor(v + dot(v, C.yyy) );
		vec3 x0 =   v - i + dot(i, C.xxx) ;
		vec3 g = step(x0.yzx, x0.xyz);
		vec3 l = 1.0 - g;
		vec3 i1 = min( g.xyz, l.zxy );
		vec3 i2 = max( g.xyz, l.zxy );
		vec3 x1 = x0 - i1 + C.xxx;
		vec3 x2 = x0 - i2 + C.yyy;
		vec3 x3 = x0 - D.yyy;
		i = mod289(i);
		vec4 p = permute( permute( permute(
					i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
				+ i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
				+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
		float n_ = 0.142857142857;
		vec3  ns = n_ * D.wyz - D.xzx;
		vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
		vec4 x_ = floor(j * ns.z);
		vec4 y_ = floor(j - 7.0 * x_ );
		vec4 x = x_ *ns.x + ns.yyyy;
		vec4 y = y_ *ns.x + ns.yyyy;
		vec4 h = 1.0 - abs(x) - abs(y);
		vec4 b0 = vec4( x.xy, y.xy );
		vec4 b1 = vec4( x.zw, y.zw );
		vec4 s0 = floor(b0)*2.0 + 1.0;
		vec4 s1 = floor(b1)*2.0 + 1.0;
		vec4 sh = -step(h, vec4(0.0));
		vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
		vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
		vec3 p0 = vec3(a0.xy,h.x);
		vec3 p1 = vec3(a0.zw,h.y);
		vec3 p2 = vec3(a1.xy,h.z);
		vec3 p3 = vec3(a1.zw,h.w);
		vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
		p0 *= norm.x;
		p1 *= norm.y;
		p2 *= norm.z;
		p3 *= norm.w;
		vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
		m = m * m;
		return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
	}

	void main() {
		vNormal = normalize(normalMatrix * normal);
		
		// Add noise displacement
		float noise = snoise(position * 1.5 + uTime * 0.2);
		vNoise = noise;
		
		// Displacement increases with breath phase
		float displacement = noise * uNoiseIntensity * (1.0 + uBreathPhase * 1.0);
		vec3 newPosition = position + normal * displacement;
		
		vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
		vWorldPosition = worldPosition.xyz;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
	}
`;

export const FRESNEL_FRAGMENT_SHADER = `
	uniform vec3 uColor;
	uniform float uOpacity;
	uniform float uFresnelIntensity;
	uniform float uEmissiveIntensity;
	uniform float uTime;
	uniform float uChromaticAberration;
	varying vec3 vNormal;
	varying vec3 vWorldPosition;
	varying float vNoise;

	void main() {
		vec3 viewDir = normalize(cameraPosition - vWorldPosition + 0.00001);
		float dotProduct = dot(viewDir, vNormal);

		// Dual-layer fresnel for nuanced edge glow (lowered exponents for softness)
		float fresnelSoft = pow(1.0 - clamp(abs(dotProduct), 0.0, 1.0), 1.5);   // Softer (was 2.0)
		float fresnelSharp = pow(1.0 - clamp(abs(dotProduct), 0.0, 1.0), 3.5);  // Softer (was 5.0)
		float fresnel = mix(fresnelSoft, fresnelSharp, 0.4);                     // More soft mix (was 0.3)

		// Subtle shimmer based on noise
		float shimmer = vNoise * 0.1;

		// Procedural chromatic aberration (RGB channel offset)
		// Mix toward saturated base color (not white) to preserve color saturation
		vec3 glowTarget = uColor * (1.0 + uEmissiveIntensity); 
		vec3 chromaticColor;
		chromaticColor.r = mix(uColor, glowTarget, fresnel * uFresnelIntensity * 0.5 * (1.0 + uChromaticAberration)).r;
		chromaticColor.g = mix(uColor, glowTarget, fresnel * uFresnelIntensity * 0.5).g;
		chromaticColor.b = mix(uColor, glowTarget, fresnel * uFresnelIntensity * 0.5 * (1.0 - uChromaticAberration)).b;

		// Final color with chromatic aberration and shimmer
		vec3 finalColor = chromaticColor + shimmer;

		// Opacity modulation
		float finalOpacity = uOpacity + (fresnel * uFresnelIntensity * 0.4);

		gl_FragColor = vec4(finalColor, clamp(finalOpacity, 0.0, 1.0));
	}
`;

export const createFresnelMaterial = (noiseIntensity: number = 0.05) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0.05 }, // Much more ethereal (was 0.15)
      uFresnelIntensity: { value: 1.0 },
      uEmissiveIntensity: { value: 0.5 },
      uTime: { value: 0 },
      uNoiseIntensity: { value: noiseIntensity },
      uBreathPhase: { value: 0 },
      uChromaticAberration: { value: 0.02 },
    },
    vertexShader: FRESNEL_VERTEX_SHADER,
    fragmentShader: FRESNEL_FRAGMENT_SHADER,
  });
// ============================================================================
// GLASS REFRACTION SHADER - Multiside glass with mood-colored reflections
// ============================================================================

export const GLASS_REFRACTION_VERTEX_SHADER = `
	attribute vec3 instanceColor;

	varying vec3 vWorldPosition;
	varying vec3 vWorldNormal;
	varying vec3 vEyeVector;
	varying vec3 vMoodColor;
	varying vec2 vScreenUV;

	void main() {
		// Apply instance transform to position and normal
		vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
		vWorldPosition = worldPosition.xyz;

		// Transform normal to world space (inverse transpose of model matrix)
		mat3 normalMatrix = mat3(instanceMatrix);
		vWorldNormal = normalize(normalMatrix * normal);

		// Calculate eye vector (camera to vertex in world space)
		vEyeVector = normalize(vWorldPosition - cameraPosition);

		// Pass instance color (mood color) to fragment shader
		vMoodColor = instanceColor;

		// Calculate screen-space position
		vec4 clipPosition = projectionMatrix * viewMatrix * worldPosition;
		gl_Position = clipPosition;

		// Calculate screen UV (0-1 range) for render target sampling
		vScreenUV = clipPosition.xy / clipPosition.w * 0.5 + 0.5;
	}
`;

export const GLASS_REFRACTION_FRAGMENT_SHADER = `
	varying vec3 vWorldPosition;
	varying vec3 vWorldNormal;
	varying vec3 vEyeVector;
	varying vec3 vMoodColor;
	varying vec2 vScreenUV;

	uniform sampler2D uEnvMap;
	uniform sampler2D uBackfaceMap;
	uniform vec2 uResolution;
	uniform float uBreathPhase;
	uniform float uIORMin;
	uniform float uIORMax;
	uniform float uBackfaceMix;
	uniform float uRefractionStrength;
	uniform float uMoodReflectionStrength;
	uniform float uGlassTint;
	uniform float uFresnelPower;
	uniform float uOpacity;

	void main() {
		// Normalize interpolated vectors
		vec3 worldNormal = normalize(vWorldNormal);
		vec3 eyeVector = normalize(vEyeVector);

		// === 1. BREATH-SYNCHRONIZED INDEX OF REFRACTION ===
		float breathEased = smoothstep(0.0, 1.0, uBreathPhase);
		float ior = mix(uIORMin, uIORMax, breathEased);

		// === 2. MULTISIDE REFRACTION (Front + Back normals) ===
		vec3 backfaceNormal = texture2D(uBackfaceMap, vScreenUV).rgb * 2.0 - 1.0;
		vec3 combinedNormal = worldNormal * (1.0 - uBackfaceMix) - backfaceNormal * uBackfaceMix;
		combinedNormal = normalize(combinedNormal);

		// === 3. REFRACTION CALCULATION ===
		vec3 refractedVector = refract(eyeVector, combinedNormal, 1.0 / ior);

		// Handle total internal reflection
		bool isTotalInternalReflection = (length(refractedVector) < 0.01);
		if (isTotalInternalReflection) {
			refractedVector = reflect(eyeVector, combinedNormal);
		}

		// Convert refracted vector to screen UV offset
		vec2 refractionOffset = refractedVector.xy * uRefractionStrength;
		vec2 refractedUV = vScreenUV + refractionOffset;
		refractedUV = clamp(refractedUV, 0.0, 1.0);

		// Sample environment texture with refracted UV
		vec3 refractedColor = texture2D(uEnvMap, refractedUV).rgb;

		// === 4. FRESNEL REFLECTION ===
		float fresnelDot = abs(dot(eyeVector, worldNormal));
		float fresnel = pow(1.0 - fresnelDot, uFresnelPower);

		// === 5. MOOD-COLORED REFLECTION ===
		vec3 reflectedVector = reflect(eyeVector, worldNormal);
		vec2 reflectionOffset = reflectedVector.xy * 0.1;
		vec2 reflectedUV = clamp(vScreenUV + reflectionOffset, 0.0, 1.0);

		vec3 reflectedColor = texture2D(uEnvMap, reflectedUV).rgb;
		vec3 moodReflection = mix(reflectedColor, reflectedColor * vMoodColor, uMoodReflectionStrength);

		// === 6. GLASS BODY TINT ===
		vec3 tintedRefraction = mix(refractedColor, refractedColor * vMoodColor, uGlassTint);

		// === 7. FINAL COLOR COMPOSITION ===
		vec3 finalColor = mix(tintedRefraction, moodReflection, fresnel);

		// Add subtle mood glow during inhale
		vec3 moodGlow = vMoodColor * fresnel * breathEased * 0.3;
		finalColor += moodGlow;

		// === 8. OPACITY ===
		float finalOpacity = uOpacity + (fresnel * 0.3);
		finalOpacity = clamp(finalOpacity, 0.0, 1.0);

		gl_FragColor = vec4(finalColor, finalOpacity);
	}
`;

export const createGlassRefractionMaterial = (): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      // Render targets
      uEnvMap: { value: null },
      uBackfaceMap: { value: null },

      // Screen parameters
      uResolution: { value: new THREE.Vector2(1920, 1080) },

      // Breath synchronization
      uBreathPhase: { value: 0 },

      // Refraction parameters
      uIORMin: { value: 1.15 },
      uIORMax: { value: 1.52 },
      uBackfaceMix: { value: 0.33 },
      uRefractionStrength: { value: 0.15 },

      // Appearance parameters
      uMoodReflectionStrength: { value: 0.5 },
      uGlassTint: { value: 0.2 },
      uFresnelPower: { value: 3.0 },
      uOpacity: { value: 0.85 },
    },
    vertexShader: GLASS_REFRACTION_VERTEX_SHADER,
    fragmentShader: GLASS_REFRACTION_FRAGMENT_SHADER,
  });
};
