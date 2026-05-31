import * as THREE            from 'three';
import { EffectComposer }    from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }        from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }   from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }        from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass }        from 'three/addons/postprocessing/OutputPass.js';

// ─── Renderer ─────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
document.getElementById('canvas-wrap').appendChild(renderer.domElement);

// ─── Scene & Camera ───────────────────────────────────────────────────────────

const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog        = new THREE.FogExp2(0x050510, 0.028);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 120);
camera.position.set(0, 0, 16);

// ─── Post-processing ─────────────────────────────────────────────────────────

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  1.15,   // strength
  0.55,   // radius
  0.06,   // threshold — low so gradients bloom
);
composer.addPass(bloom);

// Vignette + chromatic aberration as a single final ShaderPass
const FinalShader = {
  uniforms: {
    tDiffuse:   { value: null },
    uAberration: { value: 0.004 },
    uVignette:   { value: 0.55 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAberration;
    uniform float uVignette;
    varying vec2 vUv;

    void main() {
      vec2 dir  = vUv - 0.5;
      float d   = length(dir);

      // Chromatic aberration — channels offset outward from centre
      float r = texture2D(tDiffuse, vUv - dir * uAberration * d).r;
      float g = texture2D(tDiffuse, vUv                          ).g;
      float b = texture2D(tDiffuse, vUv + dir * uAberration * d).b;

      vec3 col = vec3(r, g, b);

      // Smooth vignette
      col *= 1.0 - uVignette * smoothstep(0.25, 0.9, d);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
composer.addPass(new ShaderPass(FinalShader));
composer.addPass(new OutputPass());

// ─── Gradient shader (applied to every shape) ─────────────────────────────────

const VERT = /* glsl */`
  varying vec3 vPos;
  varying vec3 vNorm;

  void main() {
    vPos  = position;
    vNorm = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  uniform vec3  uA;
  uniform vec3  uB;
  uniform float uT;

  varying vec3 vPos;
  varying vec3 vNorm;

  void main() {
    // Animated colour gradient across the mesh surface
    float t = sin(vPos.y * 2.2 + vPos.x * 1.1 + uT * 0.65) * 0.5 + 0.5;
    vec3 col = mix(uA, uB, t);

    // Rim glow: edges face away from +Z (approx. view direction)
    float rim = pow(1.0 - abs(dot(normalize(vNorm), vec3(0.0, 0.0, 1.0))), 2.5);
    col += uB * rim * 0.6;

    // Multiply above bloom threshold
    gl_FragColor = vec4(col * 1.75, 1.0);
  }
`;

function gradMat(hexA, hexB) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uA: { value: new THREE.Color(hexA) },
      uB: { value: new THREE.Color(hexB) },
      uT: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const PALETTES = [
  ['#00ffee', '#0033ff'],
  ['#ff00cc', '#6600ff'],
  ['#00ff88', '#00aaff'],
  ['#ff6600', '#ff0055'],
  ['#eeee00', '#00ff55'],
  ['#ff44cc', '#00eeff'],
];

// ─── Geometry catalogue ───────────────────────────────────────────────────────

const GEO_FACTORIES = [
  () => new THREE.IcosahedronGeometry(1, 0),
  () => new THREE.OctahedronGeometry(1, 0),
  () => new THREE.DodecahedronGeometry(1, 0),
  () => new THREE.TetrahedronGeometry(1, 0),
  () => new THREE.TorusKnotGeometry(0.6, 0.22, 90, 14),
  () => new THREE.IcosahedronGeometry(1, 1),
  () => new THREE.TorusGeometry(0.7, 0.28, 12, 36),
];

// ─── Create floating shapes ───────────────────────────────────────────────────

const shapes = [];

for (let i = 0; i < 26; i++) {
  const pal  = PALETTES[i % PALETTES.length];
  const geo  = GEO_FACTORIES[Math.floor(Math.random() * GEO_FACTORIES.length)]();
  const mat  = gradMat(pal[0], pal[1]);
  const mesh = new THREE.Mesh(geo, mat);

  // Some shapes get a translucent wireframe twin for extra visual richness
  if (Math.random() < 0.45) {
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(pal[0]).multiplyScalar(3.5),
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    mesh.add(new THREE.Mesh(geo, wireMat));
  }

  // Scatter across the scene volume
  mesh.position.set(
    (Math.random() - 0.5) * 30,
    (Math.random() - 0.5) * 14,
    (Math.random() - 0.5) * 16,
  );

  const s = 0.5 + Math.random() * 1.6;
  mesh.scale.setScalar(s);
  mesh.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  );

  mesh.userData = {
    rotSpd: new THREE.Vector3(
      (Math.random() - 0.5) * 0.005,
      (Math.random() - 0.5) * 0.007,
      (Math.random() - 0.5) * 0.004,
    ),
    floatAmp:   0.12 + Math.random() * 0.38,
    floatFreq:  0.28 + Math.random() * 0.55,
    floatPhase: Math.random() * Math.PI * 2,
    initY: mesh.position.y,
  };

  scene.add(mesh);
  shapes.push(mesh);
}

// ─── Particle field ───────────────────────────────────────────────────────────

{
  const N   = 900;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);

  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 44;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 22;

    const c = new THREE.Color().setHSL(Math.random(), 1.0, 0.72);
    col[i * 3]     = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.07,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  })));
}

// ─── Camera path (4 control points, one per section) ─────────────────────────

const camCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(  0,   0,  16),   // section 1 — looking into the field
  new THREE.Vector3( 11,  3.5,  8),   // section 2 — sweep right
  new THREE.Vector3( -9,  -2,   6),   // section 3 — sweep left
  new THREE.Vector3(  2,   5,  14),   // section 4 — pull back and rise
], false, 'catmullrom', 0.5);

const lookCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3( 0,  0,  0),
  new THREE.Vector3( 2,  0.5, 0),
  new THREE.Vector3(-2,  0,  0),
  new THREE.Vector3( 0, -1,  0),
], false, 'catmullrom', 0.5);

// ─── Scroll → camera ─────────────────────────────────────────────────────────

let scrollT  = 0;   // smoothed progress [0..1]
let targetT  = 0;   // raw    progress

const barEl  = document.getElementById('bar');
const dots   = document.querySelectorAll('.dot');

window.addEventListener('scroll', () => {
  const maxY = document.documentElement.scrollHeight - innerHeight;
  targetT = maxY > 0 ? Math.min(window.scrollY / maxY, 1) : 0;

  // Progress bar
  barEl.style.width = `${targetT * 100}%`;

  // Active nav dot (one per quarter)
  const idx = Math.min(Math.floor(targetT * 4), 3);
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
}, { passive: true });

// ─── Section text → Intersection Observer ────────────────────────────────────

const io = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  }),
  { threshold: 0.25 },
);

document.querySelectorAll('[data-card]').forEach(el => io.observe(el));

// ─── Animation loop ───────────────────────────────────────────────────────────

const clock  = new THREE.Clock();
const tmpVec = new THREE.Vector3();

(function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Smooth scroll progress
  scrollT += (targetT - scrollT) * 0.055;
  const s = Math.max(0, Math.min(0.9999, scrollT));

  // Drive camera along the curve
  camCurve.getPoint(s, tmpVec);
  camera.position.lerp(tmpVec, 0.07);

  lookCurve.getPoint(s, tmpVec);
  camera.lookAt(tmpVec);

  // Animate each shape
  shapes.forEach(m => {
    const d = m.userData;
    m.rotation.x += d.rotSpd.x;
    m.rotation.y += d.rotSpd.y;
    m.rotation.z += d.rotSpd.z;
    m.position.y  = d.initY + Math.sin(t * d.floatFreq + d.floatPhase) * d.floatAmp;
    m.material.uniforms.uT.value = t;
  });

  composer.render();
}());

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth, innerHeight);
});
