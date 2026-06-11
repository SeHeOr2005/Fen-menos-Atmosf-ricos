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

    // Conservar las fórmulas de densidad y físicas originales del shader de ondas
    float height = max(length(vWorldPos) - uPlanetRadius, 0.0);
    float atmH = max(uAtmosphereRadius - uPlanetRadius, 0.001);
    float h = clamp(height / atmH, 0.0, 1.0);
    float density = exp(-h * uDensityFalloff);

    vec3 betaR = uRayleighStrength * (1.0 / pow(lambda, vec3(4.0)));
    betaR *= 0.000015;
    vec3 betaM = uMieStrength * vec3(1.0);

    float rPhase = rayleighPhase(mu);
    float mPhase = miePhase(mu, uMieG);

    // Cálculo original de la dispersión de ondas
    vec3 scatter = uSunIntensity * density * (betaR * rPhase + betaM * mPhase);
    scatter *= uExposure;
    vec3 originalColor = 1.0 - exp(-scatter);

    // Iluminación diurna base
    float sunIllumination = dot(dir, sunDir);
    float isDaySide = smoothstep(-0.1, 0.2, sunIllumination);

    // ─── ATMÓSFERA AZUL TRANSPARENTE BASE ────────────────────────────────
    vec3 cleanBlue = vec3(0.12, 0.40, 1.0) * uBlueBoost * 0.75;
    vec3 baseAtmosphereColor = mix(originalColor, cleanBlue, 0.7);

    // ─── EFECTO CREPÚSCULO NARANJA LOCALIZADO EN LA CASA ─────────────────
    // Posición exacta de la casa en la superficie terrestre (OBSERVER_POS = vec3(3.0, 0.0, 0.0))
    vec3 housePos = vec3(3.0, 0.0, 0.0);
    vec3 houseDir = normalize(housePos);
    
    // 1. Dónde se pinta: Máscara radial sobre la vertical de la casa
    float proximityToHouse = dot(dir, houseDir);
    float houseMask = smoothstep(0.85, 0.98, proximityToHouse);

    // 2. Cuándo se pinta: Calculamos el ángulo entre el sol y el horizonte de la casa
    // El producto punto entre la dirección de la casa y el sol nos da 0.0 EXACTAMENTE cuando el sol está en el horizonte (6 AM / 6 PM)
    float sunHouseDot = dot(sunDir, houseDir);
    
    // Filtramos para que solo se active cuando el sol esté rozando el horizonte (-0.3 a 0.3)
    // Al mediodía el valor de sunHouseDot será alto o perpendicular rompiendo esta condición, apagando el naranja.
    float goldenHourFactor = smoothstep(0.35, 0.0, abs(sunHouseDot));
    
    // Apagado total si el sistema maestro indica que es de noche (uIsNight)
    goldenHourFactor = mix(goldenHourFactor, 0.0, uIsNight);

    // Color naranja estético para el crepúsculo
    vec3 sunsetOrange = vec3(1.0, 0.38, 0.05) * uRedBoost * 1.3;

    // Combinamos la atmósfera azul base con el toque naranja localizado
    vec3 finalColor = mix(baseAtmosphereColor, sunsetOrange, houseMask * goldenHourFactor * 0.9);

    // Aplicamos la iluminación global para oscurecer la cara nocturna
    finalColor *= isDaySide;

    // Corrección gamma original
    finalColor = clamp(finalColor, 0.0, 1.0);
    finalColor = pow(finalColor, vec3(0.9));

    // Efecto Fresnel para bordes cristalinos translúcidos
    float fresnel = 1.0 - max(0.0, dot(viewDir, dir));
    fresnel = pow(fresnel, 2.5);

    // Transparencia (Alpha) dinámica dependiente del Fresnel, el brillo y el lado del día
    float alpha = clamp(uAlpha * (0.15 + length(finalColor) * 0.5 + fresnel * 0.35), 0.0, 1.0) * isDaySide;

    gl_FragColor = vec4(finalColor, alpha);
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