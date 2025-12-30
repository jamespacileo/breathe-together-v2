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
// PAINTED BACKGROUND SHADER - Minimalist Gradient with Paper Texture
// ============================================================================

export const PAINTED_BACKGROUND_VERTEX_SHADER = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        // Full screen quad in clip space
        gl_Position = vec4(position, 1.0);
    }
`;

export const PAINTED_BACKGROUND_FRAGMENT_SHADER = `
    varying vec2 vUv;
    uniform float uTime;

    void main() {
        // Palette: Monument Valley "Valley" level tones
        vec3 top = vec3(0.98, 0.96, 0.93);   // Off-white/Cream
        vec3 bottom = vec3(0.95, 0.85, 0.80); // Soft Terracotta/Peach
        
        // Very smooth vertical gradient
        float t = smoothstep(0.0, 1.0, vUv.y);
        vec3 color = mix(bottom, top, t);
        
        // Subtle noise for paper texture feel
        float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03;
        
        gl_FragColor = vec4(color + noise, 1.0);
    }
`;

// ============================================================================
// GLASS REFRACTION SHADER - Multiside glass with mood-colored reflections
// ============================================================================

export const GLASS_REFRACTION_VERTEX_SHADER = `
	varying vec3 vWorldPosition;
	varying vec3 vWorldNormal;
	varying vec3 vEyeVector;
	varying vec3 vMoodColor;
	varying vec2 vScreenUV;

	void main() {
		// Position in world space (InstancedMesh handles instanceMatrix automatically)
		vec4 worldPosition = modelMatrix * vec4(position, 1.0);
		vWorldPosition = worldPosition.xyz;

		// Transform normal to world space (simple mat3 for normal transformation)
		vWorldNormal = normalize(mat3(modelMatrix) * normal);

		// Calculate eye vector (camera to vertex in world space)
		vEyeVector = normalize(vWorldPosition - cameraPosition);

		// Mood color (white fallback)
		vMoodColor = vec3(1.0);

		// Calculate clip position and screen UV
		vec4 clipPosition = projectionMatrix * viewMatrix * worldPosition;
		gl_Position = clipPosition;
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
		// Note: Reference uses fixed IOR 1.3 usually, but lets stick to dynamic or fixed param
		// Reference: ior: 1.3
		float ior = mix(uIORMin, uIORMax, breathEased); 

		// === 2. MULTISIDE REFRACTION (Front + Back normals) ===
		vec3 backfaceNormal = texture2D(uBackfaceMap, vScreenUV).rgb * 2.0 - 1.0;
		// Reference uses simple mixing: 
		// vec3 normal = normalize(worldNormal * (1.0 - backfaceIntensity) - backfaceNormal * backfaceIntensity);
		vec3 combinedNormal = normalize(worldNormal * (1.0 - uBackfaceMix) - backfaceNormal * uBackfaceMix);

		// === 3. REFRACTION CALCULATION ===
		vec3 refractedVector = refract(eyeVector, combinedNormal, 1.0 / ior);
		
		// Very subtle distortion for a clean, polished look (Reference: 0.05)
		vec2 refractionOffset = refractedVector.xy * uRefractionStrength; 
		vec2 refractedUV = vScreenUV + refractionOffset;

		// Sample environment texture with refracted UV
		vec3 tex = texture2D(uEnvMap, refractedUV).rgb;

		// === 1. FROSTED TINT ===
		// "Instead of adding light (glow), we multiply the refraction by the mood color."
		vec3 tintedRefraction = tex * mix(vec3(1.0), vMoodColor, uGlassTint); // uGlassTint ~ 0.5

		// === 2. MATTE BODY ===
		// "Mix in a bit of the raw solid color to make it look semi-opaque/milky"
		vec3 bodyColor = mix(tintedRefraction, vMoodColor, 0.25);

		// === 3. FRESNEL / RIM ===
		// "A sharper, whiter rim to mimic the clean edges in Monument Valley art"
		float fresnel = pow(1.0 - clamp(dot(combinedNormal, -eyeVector), 0.0, 1.0), uFresnelPower); // Reference: 3.0

		// === 4. SOFT TOP-DOWN LIGHT ===
		// "Simulates a soft ambient environment"
		float topLight = smoothstep(0.0, 1.0, combinedNormal.y) * 0.1; // Reference: 0.1

		vec3 finalColor = mix(bodyColor, vec3(1.0), fresnel * 0.4);
		finalColor += vec3(1.0) * topLight;

		gl_FragColor = vec4(finalColor, uOpacity);
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
      uGlassTint: { value: 0.5 }, // Reference: 0.5
      uFresnelPower: { value: 3.0 },
      uOpacity: { value: 1.0 },
    },
    vertexShader: GLASS_REFRACTION_VERTEX_SHADER,
    fragmentShader: GLASS_REFRACTION_FRAGMENT_SHADER,
  });
};
