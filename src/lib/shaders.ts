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
// NEBULA SHADER - Procedural cloud nebula with breath synchronization
// ============================================================================

export const NEBULA_VERTEX_SHADER = `
	varying vec2 vUv;
	varying vec3 vPosition;

	void main() {
		vUv = uv;
		vPosition = position;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

export const NEBULA_FRAGMENT_SHADER = `
	varying vec2 vUv;
	varying vec3 vPosition;

	uniform float uTime;
	uniform float uBreathPhase;
	uniform vec3 uColorExhale;
	uniform vec3 uColorInhale;
	uniform float uAtmosphere;
	uniform float uDensity;

	// Simplex noise function (3D)
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

	// Fractional Brownian motion (fBm) - multiple octaves of noise
	float fbm(vec3 p) {
		float value = 0.0;
		float amplitude = 1.0;
		float frequency = 1.0;
		float maxValue = 0.0;

		// 4 octaves of noise for depth and detail
		for(int i = 0; i < 4; i++) {
			value += amplitude * snoise(p * frequency);
			maxValue += amplitude;
			amplitude *= 0.5;
			frequency *= 2.0;
		}

		return value / maxValue;
	}

	void main() {
		// Centered UVs for nebula generation (-0.5 to 0.5)
		vec3 noiseInput = vec3(vUv * 2.0 - 1.0, uTime * 0.05);

		// Generate multi-octave noise with gentle drift
		float cloudNoise = fbm(noiseInput * 1.5);

		// Normalize noise to 0-1 range
		cloudNoise = cloudNoise * 0.5 + 0.5;

		// Color transition based on breath phase: cool (exhale) to warm (inhale)
		vec3 nebulaColor = mix(uColorExhale, uColorInhale, uBreathPhase);

		// Opacity controlled by cloud density and atmosphere
		float opacity = cloudNoise * uDensity * uAtmosphere;

		// Add subtle glow during inhale
		float glow = cloudNoise * uBreathPhase * 0.2;
		vec3 finalColor = nebulaColor * (1.2 + uBreathPhase * 0.3 + glow);

		gl_FragColor = vec4(finalColor, opacity);
	}
`;

export const createNebulaMaterial = (colorExhale: string, colorInhale: string) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uBreathPhase: { value: 0 },
      uColorExhale: { value: new THREE.Color(colorExhale) },
      uColorInhale: { value: new THREE.Color(colorInhale) },
      uAtmosphere: { value: 0.5 },
      uDensity: { value: 2.0 },
    },
    vertexShader: NEBULA_VERTEX_SHADER,
    fragmentShader: NEBULA_FRAGMENT_SHADER,
  });

// ============================================================================
// GRADIENT BACKGROUND SHADER - Breath-synchronized vertical gradient
// ============================================================================

export const GRADIENT_VERTEX_SHADER = `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

export const GRADIENT_FRAGMENT_SHADER = `
	varying vec2 vUv;

	uniform vec3 uColorBottomExhale;
	uniform vec3 uColorTopExhale;
	uniform vec3 uColorBottomInhale;
	uniform vec3 uColorTopInhale;
	uniform float uBreathPhase;

	void main() {
		// Vertical gradient from bottom (y=0) to top (y=1)
		float gradientMix = vUv.y;

		// Exhale gradient state (bottom dark → top medium)
		vec3 colorExhale = mix(uColorBottomExhale, uColorTopExhale, gradientMix);

		// Inhale gradient state (bottom dark → top bright)
		vec3 colorInhale = mix(uColorBottomInhale, uColorTopInhale, gradientMix);

		// Breathe between the two gradient states
		vec3 finalColor = mix(colorExhale, colorInhale, uBreathPhase);

		gl_FragColor = vec4(finalColor, 1.0); // Opaque
	}
`;

export const createGradientMaterial = (
  colorBottomExhale: string,
  colorTopExhale: string,
  colorBottomInhale: string,
  colorTopInhale: string,
) =>
  new THREE.ShaderMaterial({
    transparent: false, // Opaque background
    depthWrite: true,
    side: THREE.FrontSide,
    uniforms: {
      uColorBottomExhale: { value: new THREE.Color(colorBottomExhale) },
      uColorTopExhale: { value: new THREE.Color(colorTopExhale) },
      uColorBottomInhale: { value: new THREE.Color(colorBottomInhale) },
      uColorTopInhale: { value: new THREE.Color(colorTopInhale) },
      uBreathPhase: { value: 0 },
    },
    vertexShader: GRADIENT_VERTEX_SHADER,
    fragmentShader: GRADIENT_FRAGMENT_SHADER,
  });
