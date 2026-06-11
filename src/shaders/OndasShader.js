import * as THREE from "three";

export const spectralVertexShader = `
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const spectralFragmentShader = `
  precision highp float;

  varying vec3 vWorldPos;

  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform float uPlanetRadius;
  uniform float uAtmosphereRadius;
  uniform float uRayleighStrength;
  uniform float uMieStrength;
  uniform float uMieG;
  uniform float uDensityFalloff;
  uniform float uAlpha;
  uniform float uExposure;
  uniform float uBlueBoost;
  uniform float uRedBoost;
  uniform float uIsNight; // 0 = día/atardecer, 1 = noche

  const float PI = 3.14159265359;
  const vec3 lambda = vec3(0.680, 0.550, 0.440);

  float rayleighPhase(float mu) {
    return 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  }

  float miePhase(float mu, float g) {
    float g2 = g * g;
    return 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + mu * mu)) /
           ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
  }

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 sunDir = normalize(uSunDirection);
    vec3 dir = normalize(vWorldPos);

    float mu = dot(viewDir, sunDir);

    float height = max(length(vWorldPos) - uPlanetRadius, 0.0);
    float atmH = max(uAtmosphereRadius - uPlanetRadius, 0.001);
    float h = clamp(height / atmH, 0.0, 1.0);

    float density = exp(-h * uDensityFalloff);

    vec3 betaR = uRayleighStrength * (1.0 / pow(lambda, vec3(4.0)));
    betaR *= 0.000015;

    vec3 betaM = uMieStrength * vec3(1.0);

    float rPhase = rayleighPhase(mu);
    float mPhase = miePhase(mu, uMieG);

    vec3 scatter = uSunIntensity * density * (betaR * rPhase + betaM * mPhase);
    scatter *= uExposure;

    vec3 color = 1.0 - exp(-scatter);

    // ─── CONTROL DE ILUMINACIÓN SOLAR ──────────────────────────────────────
    float sunIllumination = max(0.0, dot(dir, sunDir));
    
    // Si NO está iluminado por el sol, oscurecer (efecto sombra planetaria)
    color *= mix(vec3(0.02), vec3(1.0), sunIllumination);

    // ─── COMPORTAMIENTO FÍSICO NATURAL ORIGINAL ────────────────────────────
    // Se removieron las adiciones artificiales de azul y naranja en el horizonte.
    
    color = clamp(color, 0.0, 1.0);
    color = pow(color, vec3(0.9));

    float alpha = clamp(uAlpha * (0.4 + 0.6 * length(color)), 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createRayleighSpectralMaterial(options = {}) {
  const {
    sunDirection = new THREE.Vector3(1, 0, 0),
    sunIntensity = 14.0,
    rayleighStrength = 1.0,
    mieStrength = 0.002,
    mieG = 0.76,
    densityFalloff = 1.2,
    planetRadius = 3.0,
    atmosphereRadius = 3.8,
    alpha = 0.8,
    exposure = 1.0,
    blueBoost = 1.0,
    redBoost = 1.0,
    isNight = 0.0,
    side = THREE.DoubleSide,
  } = options;

  return new THREE.ShaderMaterial({
    vertexShader: spectralVertexShader,
    fragmentShader: spectralFragmentShader,
    uniforms: {
      uSunDirection: { value: sunDirection.clone().normalize() },
      uSunIntensity: { value: sunIntensity },
      uRayleighStrength: { value: rayleighStrength },
      uMieStrength: { value: mieStrength },
      uMieG: { value: mieG },
      uDensityFalloff: { value: densityFalloff },
      uPlanetRadius: { value: planetRadius },
      uAtmosphereRadius: { value: atmosphereRadius },
      uAlpha: { value: alpha },
      uExposure: { value: exposure },
      uBlueBoost: { value: blueBoost },
      uRedBoost: { value: redBoost },
      uIsNight: { value: isNight },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
  });
}