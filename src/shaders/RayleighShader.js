import * as THREE from "three";

export const rayleighVertexShader = `
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const rayleighFragmentShader = `
  precision highp float;

  varying vec3 vWorldPos;
  varying vec3 vNormal;

  uniform vec3 uSunDirection;
  uniform float uSunIntensity;
  uniform float uRayleighStrength;
  uniform float uMieStrength;
  uniform float uMieG;
  uniform float uDensityFalloff;

  uniform float uPlanetRadius;
  uniform float uAtmosphereRadius;

  // Altura por eje Y (para vista local)
  uniform float uHeightMode; // 0 = radial, 1 = eje Y
  uniform float uHeightOffset;
  uniform float uHeightScale;

  uniform vec3 uSkyTint;
  uniform float uAlpha;

  const float PI = 3.14159265359;

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
    float mu = dot(viewDir, sunDir);

    // Altura atmosférica
    float height = 0.0;
    if (uHeightMode > 0.5) {
      height = max(vWorldPos.y - uHeightOffset, 0.0) * uHeightScale;
    } else {
      height = max(length(vWorldPos) - uPlanetRadius, 0.0);
      float atmHeight = max(uAtmosphereRadius - uPlanetRadius, 0.001);
      height = height / atmHeight;
    }

    float density = exp(-height * uDensityFalloff);

    // Coeficientes espectrales (Rayleigh)
    vec3 betaR = uRayleighStrength * vec3(5.8, 13.5, 33.1) * 0.0002;
    vec3 betaM = uMieStrength * vec3(1.0);

    float rPhase = rayleighPhase(mu);
    float mPhase = miePhase(mu, uMieG);

    vec3 rayleigh = betaR * rPhase * density;
    vec3 mie = betaM * mPhase * density;

    vec3 scatter = uSunIntensity * (rayleigh + mie) * uSkyTint;
    vec3 color = 1.0 - exp(-scatter);

    float alpha = clamp(uAlpha * length(color), 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

export function createRayleighMaterial(options = {}) {
  const {
    sunDirection = new THREE.Vector3(1, 0.1, 0.2),
    sunIntensity = 10.0,
    rayleighStrength = 1.2,
    mieStrength = 0.003,
    mieG = 0.76,
    densityFalloff = 1.2,
    planetRadius = 3.0,
    atmosphereRadius = 3.5,
    heightMode = 0.0,
    heightOffset = 0.0,
    heightScale = 1.0,
    skyTint = new THREE.Color(1, 1, 1),
    alpha = 0.8,
    side = THREE.BackSide,
  } = options;

  return new THREE.ShaderMaterial({
    vertexShader: rayleighVertexShader,
    fragmentShader: rayleighFragmentShader,
    uniforms: {
      uSunDirection: { value: sunDirection.clone().normalize() },
      uSunIntensity: { value: sunIntensity },
      uRayleighStrength: { value: rayleighStrength },
      uMieStrength: { value: mieStrength },
      uMieG: { value: mieG },
      uDensityFalloff: { value: densityFalloff },
      uPlanetRadius: { value: planetRadius },
      uAtmosphereRadius: { value: atmosphereRadius },
      uHeightMode: { value: heightMode },
      uHeightOffset: { value: heightOffset },
      uHeightScale: { value: heightScale },
      uSkyTint: { value: skyTint },
      uAlpha: { value: alpha },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side,
  });
}