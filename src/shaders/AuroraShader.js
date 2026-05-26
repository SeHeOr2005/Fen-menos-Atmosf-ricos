export const auroraVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const auroraFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;

  float random (in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  float noise (in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
      // Escalamos las coordenadas uv
      vec2 st = vUv * vec2(8.0, 3.0); 
      
      // Movimiento vertical y horizontal deformado
      st.x += uTime * 0.15;
      st.y += sin(uTime * 0.3 + st.x * 3.0) * 0.3;

      // Capas de ruido fractal(FBM)
      float n = noise(st + vec2(uTime * 0.2, uTime * 0.1));
      n += noise(st * 2.0 - vec2(uTime * 0.4, 0.0)) * 0.5;
      n += noise(st * 4.0 + vec2(uTime * 0.8, -uTime * 0.2)) * 0.25;
      
      // Suavizado vertical (la aurora desvanece arriba y abajo)
      float gradient = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.4, vUv.y);

      // Colores reales definidos por secciones de la Aurora
      vec3 colorGreen = vec3(0.05, 1.0, 0.4);  // Base verde súper predominante
      vec3 colorRed   = vec3(1.0, 0.05, 0.1);  // Franja intensa y viva de color rojo fuego
      vec3 colorPurple= vec3(0.6, 0.1, 1.0);   // Franja media-alta morada
      vec3 colorBlue  = vec3(0.0, 0.3, 1.0);   // Pico azul profundo arriba
      
      // La base de la aurora es predominantemente verde esmeralda brillante
      vec3 auroraColor = colorGreen;
      
      // Más arriba interviene furiosamente el rojo (típico del oxígeno a alta altitud)
      // Ajustamos el "smoothstep" bajando los valores para que el rojo abarque mucha más franja central
      auroraColor = mix(auroraColor, colorRed, smoothstep(0.25, 0.60, vUv.y - n * 0.15));
      
      // Más arriba pasa a morado oscuro
      auroraColor = mix(auroraColor, colorPurple, smoothstep(0.55, 0.80, vUv.y + n * 0.1));
      
      // Finalmente, las cimas muy altas mantienen un toque muy suave de azul noche
      auroraColor = mix(auroraColor, colorBlue, smoothstep(0.80, 0.95, vUv.y - n * 0.1));
      
      float intensity = pow(n, 1.5) * gradient;
      
      gl_FragColor = vec4(auroraColor * intensity * 2.2, intensity);
  }
`;

import * as THREE from "three";

export const auroraMaterial = new THREE.ShaderMaterial({
  vertexShader: auroraVertexShader,
  fragmentShader: auroraFragmentShader,
  uniforms: { uTime: { value: 0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});
