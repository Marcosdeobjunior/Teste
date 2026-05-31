import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ─── Scene & Camera ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0d2440, 60, 220);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 7, 20);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 3;
controls.maxDistance = 80;
controls.enableDamping = true;
controls.dampingFactor = 0.06;

// ─── Sky ─────────────────────────────────────────────────────────────────────
const SUN_DIR = new THREE.Vector3(0.4, 0.6, -0.7).normalize();

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    uSunDir:      { value: SUN_DIR },
    uZenith:      { value: new THREE.Color(0x08111f) },
    uHorizon:     { value: new THREE.Color(0x1a4a7a) },
    uSunColor:    { value: new THREE.Color(1.0, 0.88, 0.6) },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uSunDir;
    uniform vec3 uZenith;
    uniform vec3 uHorizon;
    uniform vec3 uSunColor;
    varying vec3 vDir;

    void main() {
      vec3 d = normalize(vDir);
      float h = max(0.0, d.y);
      vec3 sky = mix(uHorizon, uZenith, pow(h, 0.45));

      // Horizon glow
      float glow = pow(1.0 - h, 6.0) * 0.4;
      sky += uSunColor * glow;

      // Sun disc + halo
      float sun = dot(d, uSunDir);
      float disc = smoothstep(0.9996, 0.9999, sun);
      float halo = pow(max(0.0, sun), 80.0) * 0.4;
      sky += uSunColor * (disc + halo);

      gl_FragColor = vec4(sky, 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(350, 32, 32), skyMat));

// ─── Cube camera for real-time reflections ───────────────────────────────────
const cubeRT = new THREE.WebGLCubeRenderTarget(256, {
  format: THREE.RGBAFormat,
  generateMipmaps: true,
  minFilter: THREE.LinearMipmapLinearFilter,
});
const cubeCamera = new THREE.CubeCamera(0.5, 400, cubeRT);
scene.add(cubeCamera);

// ─── Lights ──────────────────────────────────────────────────────────────────
const sunLight = new THREE.DirectionalLight(0xffeebb, 2.8);
sunLight.position.copy(SUN_DIR).multiplyScalar(60);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x0d1a33, 1.2));

// ─── Scene props (give the reflection something to show) ─────────────────────
function addRock(x, z, r) {
  const geo = new THREE.DodecahedronGeometry(r, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.95, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, r * 0.25, z);
  mesh.rotation.set(Math.random(), Math.random(), Math.random());
  scene.add(mesh);
}
addRock(-18, -12, 2.8);
addRock(22,   -8, 1.9);
addRock(-8,   20, 3.5);
addRock(14,   15, 1.4);
addRock(0,   -22, 2.1);

// Floating buoy
const buoyGroup = new THREE.Group();
const buoyBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.36, 1.4, 14),
  new THREE.MeshStandardMaterial({ color: 0xdd2200, roughness: 0.5, metalness: 0.2 }),
);
buoyBody.position.y = 0.4;
buoyGroup.add(buoyBody);
const buoyBand = new THREE.Mesh(
  new THREE.TorusGeometry(0.34, 0.07, 8, 20),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
);
buoyBand.position.y = 0.55;
buoyGroup.add(buoyBand);
buoyGroup.position.set(6, 0, -4);
scene.add(buoyGroup);

// ─── Water shader ─────────────────────────────────────────────────────────────
const waterGeo = new THREE.PlaneGeometry(120, 120, 300, 300);
waterGeo.rotateX(-Math.PI / 2);

const waterMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:         { value: 0.0 },
    uEnvMap:       { value: cubeRT.texture },
    uSunDir:       { value: SUN_DIR },
    uSunColor:     { value: new THREE.Color(1.0, 0.9, 0.65) },
    uDeepColor:    { value: new THREE.Color(0x04101e) },
    uShallowColor: { value: new THREE.Color(0x0e5568) },
    uFoamColor:    { value: new THREE.Color(0xddeeff) },
  },

  // ── Vertex: Gerstner waves with analytic normals ─────────────────────────
  vertexShader: `
    uniform float uTime;

    varying vec3  vWorldPos;
    varying vec3  vNormal;
    varying float vHeight;

    #define PI      3.14159265359
    #define GRAVITY 9.8

    // Gerstner wave — returns position offset
    vec3 gwPos(vec2 dir, float steepness, float wl, vec3 p) {
      dir = normalize(dir);
      float k = 2.0 * PI / wl;
      float A = steepness / k;
      float phi = k * dot(dir, p.xz) - sqrt(GRAVITY * k) * uTime;
      return vec3(dir.x * A * cos(phi), A * sin(phi), dir.y * A * cos(phi));
    }

    // dP/dx  (tangent contribution along world X)
    vec3 gwTang(vec2 dir, float steepness, float wl, vec3 p) {
      dir = normalize(dir);
      float k = 2.0 * PI / wl;
      float phi = k * dot(dir, p.xz) - sqrt(GRAVITY * k) * uTime;
      float s = sin(phi), c = cos(phi);
      return vec3(
        -steepness * dir.x * dir.x * s,
         steepness * dir.x * c,
        -steepness * dir.x * dir.y * s
      );
    }

    // dP/dz  (binormal contribution along world Z)
    vec3 gwBino(vec2 dir, float steepness, float wl, vec3 p) {
      dir = normalize(dir);
      float k = 2.0 * PI / wl;
      float phi = k * dot(dir, p.xz) - sqrt(GRAVITY * k) * uTime;
      float s = sin(phi), c = cos(phi);
      return vec3(
        -steepness * dir.x * dir.y * s,
         steepness * dir.y * c,
        -steepness * dir.y * dir.y * s
      );
    }

    void main() {
      vec3 p = position;

      // Accumulated displacement + analytic tangent / binormal
      vec3 disp = vec3(0.0);
      vec3 T    = vec3(1.0, 0.0, 0.0);
      vec3 B    = vec3(0.0, 0.0, 1.0);

      // 1 — long ocean swell
      disp += gwPos (vec2( 1.0,  0.0), 0.22, 20.0, p);
      T    += gwTang(vec2( 1.0,  0.0), 0.22, 20.0, p);
      B    += gwBino(vec2( 1.0,  0.0), 0.22, 20.0, p);

      // 2 — diagonal swell
      disp += gwPos (vec2( 0.7,  0.7), 0.18, 11.0, p);
      T    += gwTang(vec2( 0.7,  0.7), 0.18, 11.0, p);
      B    += gwBino(vec2( 0.7,  0.7), 0.18, 11.0, p);

      // 3 — cross-wind waves
      disp += gwPos (vec2(-0.5,  0.9), 0.14,  6.5, p);
      T    += gwTang(vec2(-0.5,  0.9), 0.14,  6.5, p);
      B    += gwBino(vec2(-0.5,  0.9), 0.14,  6.5, p);

      // 4 — chop
      disp += gwPos (vec2( 0.3, -0.9), 0.10,  3.2, p);
      T    += gwTang(vec2( 0.3, -0.9), 0.10,  3.2, p);
      B    += gwBino(vec2( 0.3, -0.9), 0.10,  3.2, p);

      // 5 — high-frequency ripples
      disp += gwPos (vec2(-0.9, -0.2), 0.05,  1.4, p);
      T    += gwTang(vec2(-0.9, -0.2), 0.05,  1.4, p);
      B    += gwBino(vec2(-0.9, -0.2), 0.05,  1.4, p);

      p += disp;

      // N = cross(B, T) → points upward (+Y) for a flat XZ surface
      vNormal   = normalize(cross(B, T));
      vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
      vHeight   = p.y;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,

  // ── Fragment: Fresnel · reflection · specular · body color · foam ─────────
  fragmentShader: `
    uniform samplerCube uEnvMap;
    uniform vec3  uSunDir;
    uniform vec3  uSunColor;
    uniform vec3  uDeepColor;
    uniform vec3  uShallowColor;
    uniform vec3  uFoamColor;

    varying vec3  vWorldPos;
    varying vec3  vNormal;
    varying float vHeight;

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(cameraPosition - vWorldPos);

      // ── Fresnel (Schlick) ──────────────────────────────────────────────────
      float cosTheta = max(0.0, dot(N, V));
      // F0 for water ≈ 0.02
      float fresnel = 0.02 + 0.98 * pow(1.0 - cosTheta, 5.0);

      // ── Environment reflection ─────────────────────────────────────────────
      vec3 R = reflect(-V, N);
      vec3 refl = textureCube(uEnvMap, R).rgb;

      // ── Sun specular (Blinn–Phong, high exponent) ──────────────────────────
      vec3  H    = normalize(uSunDir + V);
      float spec = pow(max(0.0, dot(N, H)), 512.0) * 4.0;
      vec3  specular = uSunColor * spec;

      // ── Water body color ───────────────────────────────────────────────────
      // Blend deep→shallow based on viewing angle (more top-down = shallower look)
      float viewDepth = 1.0 - cosTheta;
      vec3 waterColor = mix(uShallowColor, uDeepColor, pow(viewDepth, 0.6));

      // Fake subsurface scattering toward the sun
      float sss = pow(max(0.0, dot(uSunDir, -N)), 2.0)
                * max(0.0, dot(V, uSunDir));
      waterColor += vec3(0.0, 0.25, 0.35) * sss * 0.25;

      // ── Foam at wave crests ────────────────────────────────────────────────
      float foam = smoothstep(0.28, 0.68, vHeight);
      waterColor = mix(waterColor, uFoamColor, foam * 0.55);

      // ── Combine ───────────────────────────────────────────────────────────
      // Fresnel blends body color with environment reflection
      vec3 color = mix(waterColor, refl, fresnel) + specular;

      // Slight edge transparency
      float alpha = mix(0.82, 1.0, fresnel + foam);

      gl_FragColor = vec4(color, alpha);
    }
  `,

  transparent: true,
  depthWrite: false,
});

const water = new THREE.Mesh(waterGeo, waterMat);
scene.add(water);

// ─── Animation loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let frame = 0;

(function animate() {
  requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  waterMat.uniforms.uTime.value = t;

  // Buoy bobs on the waves
  buoyGroup.position.y = Math.sin(t * 0.9) * 0.28 + 0.1;
  buoyGroup.rotation.z = Math.sin(t * 0.6) * 0.08;
  buoyGroup.rotation.x = Math.sin(t * 0.45 + 1.2) * 0.06;

  // Update cube-camera every other frame (reflection cost amortisation)
  if (frame % 2 === 0) {
    water.visible = false;
    cubeCamera.update(renderer, scene);
    water.visible = true;
  }
  frame++;

  controls.update();
  renderer.render(scene, camera);
}());

// ─── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
