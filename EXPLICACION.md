# Arquitectura y Funcionamiento del Simulador

Este documento explica los fundamentos técnicos, las herramientas seleccionadas y el razonamiento arquitectónico detrás de la simulación de las auroras boreales.

## 1. ¿Qué estamos usando?

- **HTML, CSS y JavaScript (Vanilla ES6+):** Los lenguajes estándar de la web para la estructura UI, los estilos y la lógica sin necesidad de frameworks pesados de frontend (como React o Angular) para mantener todo ligero.
- **Three.js:** Una biblioteca de 3D para JavaScript.
- **Vite:** Una herramienta de construcción y servidor de desarrollo.
- **GLSL (OpenGL Shading Language):** Un lenguaje de programación parecido a C que se ejecuta directamente en la tarjeta de video (o chip gráfico integrado) para calcular cómo se dibuja cada píxel de las auroras.

## 2. ¿Cómo lo estamos usando?

Hemos adoptado una **arquitectura orientada a objetos (POO) y modular**:

- **`App.js`**: Actúa como el orquestador principal. Mantiene el bucle de renderizado (`requestAnimationFrame`) que dibuja la escena 60 veces por segundo, y maneja el cambio entre las dos escalas (Local y Global).
- **`GlobalScene.js` y `LocalScene.js`**: Son clases separadas que heredan o construyen sobre la escena estándar de Three.js. Cada una contiene de forma encapsulada sus modelos, partículas, luces y reglas físicas (ej. colisiones de escala humana vs campo magnético de la Tierra).
- **Shaders Personalizados (`AuroraShader.js`)**: En lugar de usar texturas planas de imágenes descargadas, usamos programas matemáticos (Shaders) para pintar luces que se mueven procedimentalmente usando algoritmos algorítmicos.

## 3. ¿Cómo funciona?

1.  **Inicialización:** Cuando abres la web, Vite carga todo y `App.js` crea un `WebGLRenderer` y lo inyecta en el HTML.
2.  **Generación de Escenas:** Construimos la topología (un plano con "ruido" para simular montañas en `LocalScene` o una esfera para la Tierra en `GlobalScene`).
3.  **Animación (El Bucle de Render):** Existe una función que se ejecuta 60 veces por segundo. En cada vuelta de este ciclo:
    - Se calcula el tiempo transcurrido (Delta Time).
    - Se actualizan las matemáticas: Se mueven las partículas de viento solar hacia adelante, se cambia la altura de las ondas senoidales en de las auroras, y cambian los colores de las colisiones.
    - La cámara captura la escena y el `renderer` pinta la imagen resultante en nuestro `<canvas>`.

## 4. ¿Por qué lo estamos usando?

- **Accesibilidad y Distribución Web:** Three.js nos permite renderizar 3D acelerado por hardware directamente en un navegador, lo que significa que cualquier persona que abra tu link podrá verlo sin instalar simuladores ni programas externos.
- **Flexibilidad Educativa:** Al poder programar las reglas (como el choque de las partículas solares contra los polos magnéticos), podemos crear una abstracción educacional dinámica de fenómenos altamente complejos. Las partículas son controlables numéricamente (por cantidad, color y frenado) gracias a la libertad que aporta JavaScript.

## 5. ¿Por qué funciona todo esto de manera tan fluida SIN una tarjeta gráfica (GPU) dedicada?

Es fácil suponer que el entorno 3D, millones de operaciones de luz (auroras) y miles de partículas ("viento solar") fundirían la computadora de un usuario convencional. Sin embargo, nuestra simulación es capaz de correr maravillosamente bien en gráficos integrados (un procesador normal) por cuatro grandes razones:

1.  **WebGL y Aceleración Base:** Aunque no tengas una GPU gigante (NVIDIA/AMD), los procesadores modernos tienen una "GPU integrada" pequeña (Intel HD, Iris Xe, etc.). WebGL se comunica directamente con ese chip, permitiendo aceleración por hardware en el navegador web.
2.  **`THREE.Points` (Optimización de Partículas):** Las estrellas, el viento solar y las colisiones atmosféricas no son esferas 3D con cálculos pesados de geometría polígonal. Son lo que en renderizado se conoce como `gl.POINTS`. Básicamente, el programa procesa un solo vértice por partícula en el espacio, y le aplica un color. Esto permite tener 5,000 partículas en pantalla costando casi el mismo procesamiento que un solo árbol 3D.
3.  **Matemáticas puras en lugar de mallas complejas (Shaders):** Las auroras boreales son en realidad geometría ultraligera (meros rectángulos, 14 planos simples). El movimiento onduloso, la niebla difuminada, la separación por franjas (Rojo, Verde, Azul) **lo hace todo nuestra tarjeta de video/chip en el "Fragment Shader"** usando funciones matemáticas como el Seno (`Math.sin`), no el propio procesador de la PC (CPU). La GPU procesa los píxeles en paralelo, lo que es infinitamente más rápido.
4.  **Limpieza de Ciclos (Garbage Collection & Reuse):** Cuando las partículas de viento solar cruzan la Tierra o se consumen en las auroras, no las estamos destruyendo de la memoria para crear nuevas (lo cual causaría cuelgues o _mem leaks_). Simplemente restablecemos matemáticamente sus parámetros (su posición `X/Y/Z` y color original). Esto hace el bucle computacionalmente "ecológico" e infinito; nunca gastamos más memoria de la inicial.

## 6. Física y Menú Interactivo (Comunicación UI-WebGL)

Para que el simulador sea fiel a la realidad y cumpla un propósito educativo riguroso, nuestra dinámica de partículas y colores se inspira en principios matemáticos reales, los cuales son "simulados" en nuestras clases JavaScript. Además, introdujimos un **Menú Acordeón Bi-direccional** que une la interfaz HTML con el modelo 3D.

Al desplegar una lección en la UI, se dispara un evento que la clase `GlobalScene` intercepta para colorear partes específicas del lienzo 3D de **Morado Brillante** e ilustrar en qué etapa actúan las siguientes ecuaciones:

### 1. El Viento Solar: Hidrodinámica y Presión

El Sol expulsa un flujo constante de plasma. La interacción de este viento con la barrera de la Tierra está regida por la **presión dinámica**, que choca y comprime nuestro campo magnético de cara al viento.

- **Ecuación de flujo dinámico:**
  $$P = \rho v^2$$
- Donde $\rho$ (rho) es la densidad de la masa del plasma y $v$ es la velocidad del viento solar.
- **Interactividad UI:** Al abrir esta lección, el motor tiñe la onda exterior del viento solar en viaje abierto de morado, demostrando el momento de pura carga cinética libre antes de golpear el campo terrestre.

### 2. El Viaje y el Atrapamiento: La Fuerza de Lorentz

Una vez el viento solar llega a la Tierra, las partículas cargadas no viajan en línea recta hacia la superficie, son capturadas y canalizadas hacia los polos magnéticos por la **Fuerza de Lorentz**.

- **Fuerza de Lorentz (Magnética):**
  $$\mathbf{F} = q(\mathbf{v} \times \mathbf{B})$$
- Donde $\mathbf{F}$ es la fuerza magnética experimentada, $q$ es la carga de la partícula, $\mathbf{v}$ es su vector de velocidad y $\mathbf{B}$ es el vector del campo magnético terrestre (dibujado en nuestra `GlobalScene` como las líneas del campo magnético). El producto cruzado ($\times$) hace que la fuerza sea perpendicular de manera constante, atrapando a las partículas en un riel invisible.
- **Interactividad UI:** Al activarse, los cilindros gigantes curvados que componen nuestro modelo del campo magnético se vuelven mucho más opacos y morados, ilustrando gráficamente dónde se ejerce esta resistencia física.

### 3. La Caída Ciclónica (Frecuencia de Ciclotrón)

A medida que las partículas descienden por las líneas magnéticas hacia la Tierra, giran en espiral alrededor de ellas, un movimiento clásico observable en plasmas atrapados magnéticamente.

- **Frecuencia de Ciclotrón:**
  $$f_c = \frac{|q| B}{2\pi m}$$
- Donde $m$ es la masa de la partícula y $B$ es la intensidad del campo magnético. Conforme $B$ se hace más intenso (al acercarse a los polos topográficos de nuestro globo terráqueo), el radio de la espiral se estrecha y su girofrecuencia $f_c$ aumenta, colisionando finalmente con los gases de la atmósfera subyacente.
- **Interactividad UI:** Las partículas de nuestro sistema "SolarWind" que superan el punto crítico (`state 2` o `state 3`) de captura pierden su rastro verde y se vuelven moradas en plena caída, visualizando el estrechamiento y aceleración de su órbita.

### 4. El Brillo de la Aurora: Mecánica Cuántica y Conservación de la Energía

El brillo verde y rojo que programamos en los _Fragment Shaders_ y en las partículas que caen localmente no es arbitario. Se debe a colisiones inelásticas donde la energía cinética de las partículas solares se transfiere a los electrones de los átomos de Oxígeno en la ionosfera (excitación). Cuando dichos átomos se relajan, liberan ese exceso energético en la forma de un fotón de luz observable.

- **Energía del fotón liberado (Relación de Planck-Einstein):**
  $$E = h \nu = \frac{hc}{\lambda}$$
- Donde $E$ es la energía liberada, $h$ es la constante de Planck, $c$ es la velocidad de la luz y $\lambda$ representa la **longitud de onda** (el color).
- **En LocalScene:** En capas altas se emite a $\sim 630$ nm (**ROJO**). En capas bajas emiten a $\sim 557.7$ nm (**VERDE ESMERALDA**).
- **Interactividad UI:** Al seleccionar esta última lección cuántica en nuestro Acordeón, le pasamos el valor uniform `uColorBase` al Shader que compone el anillo de las Auroras en la vista global, tiñendo artificialmente toda esta reacción energética colosal en un espléndido violeta, además de impactar las partículas mismas en el punto de absorción de energía.
