import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader }    from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader }    from 'three/addons/loaders/RGBELoader.js';
import { DRACOLoader }   from 'three/addons/loaders/DRACOLoader.js';

// ─── Configuration data ───────────────────────────────────────────────────────

const BODY_PRESETS = [
  { name: 'Rosso Corsa',      hex: '#cc2211' },
  { name: 'Pearl White',      hex: '#f0f0ee' },
  { name: 'Nero',             hex: '#111111' },
  { name: 'Blu Tour de F.',   hex: '#1a3575' },
  { name: 'Verde Brit.',      hex: '#1a4828' },
  { name: 'Giallo Modena',    hex: '#d4aa10' },
  { name: 'Grigio Ferro',     hex: '#888898' },
];

const WHEEL_PRESETS = [
  { id: 'chrome', label: 'Chrome',     color: '#b8b8c8', metalness: 1.0, roughness: 0.02 },
  { id: 'matte',  label: 'Matte Blk',  color: '#1a1a1a', metalness: 0.4, roughness: 0.90 },
  { id: 'gold',   label: 'Gold',       color: '#c8a030', metalness: 1.0, roughness: 0.10 },
  { id: 'white',  label: 'Pearl Wht',  color: '#eeeeec', metalness: 0.8, roughness: 0.05 },
];

const INTERIOR_PRESETS = [
  { id: 'black',  label: 'Nero',   color: '#1a1a1a', roughness: 0.65, metalness: 0.00 },
  { id: 'beige',  label: 'Cuoio',  color: '#b89060', roughness: 0.70, metalness: 0.00 },
  { id: 'red',    label: 'Rosso',  color: '#7a1818', roughness: 0.60, metalness: 0.00 },
  { id: 'carbon', label: 'Carbon', color: '#0d0d0d', roughness: 0.22, metalness: 0.55 },
];

// ─── Shared materials (mutated on option change) ──────────────────────────────

const bodyMat = new THREE.MeshPhysicalMaterial({
  color: 0xcc2211,
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
});

const rimMat = new THREE.MeshStandardMaterial({
  color: 0xb8b8c8,
  metalness: 1.0,
  roughness: 0.02,
});

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x88aacc,
  metalness: 0.05,
  roughness: 0.08,
  transparent: true,
  opacity: 0.28,
  envMapIntensity: 2.5,
});

const trimMat = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  roughness: 0.65,
  metalness: 0.00,
});

// ─── Renderer ─────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ─── Scene ────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c16);
scene.fog = new THREE.Fog(0x0c0c16, 18, 60);

// ─── Camera ───────────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(4.4, 1.6, 5.8);

// ─── Controls ─────────────────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
controls.minDistance = 2.5;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI / 2.1;

// Resume auto-rotate 4 s after the user stops interacting
let rotateTimer;
renderer.domElement.addEventListener('pointerdown', () => {
  controls.autoRotate = false;
  clearTimeout(rotateTimer);
});
renderer.domElement.addEventListener('pointerup', () => {
  rotateTimer = setTimeout(() => { controls.autoRotate = true; }, 4000);
});

// ─── Floor ────────────────────────────────────────────────────────────────────

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(11, 72),
  new THREE.MeshStandardMaterial({ color: 0x0a0a16, metalness: 0.35, roughness: 0.72 }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ─── Lights ───────────────────────────────────────────────────────────────────

const keyLight = new THREE.DirectionalLight(0xfff4e8, 2.4);
keyLight.position.set(6, 10, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 40;
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 6;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x7090ff, 0.9);
fillLight.position.set(-6, 4, -4);
scene.add(fillLight);

scene.add(new THREE.AmbientLight(0x1a1a2e, 3.0));

// ─── Environment map (HDR → PMREMGenerator for quality reflections) ───────────

function initEnvironment() {
  return new Promise((resolve) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new RGBELoader().load(
      'https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr',
      (hdr) => {
        const envMap = pmrem.fromEquirectangular(hdr).texture;
        scene.environment = envMap;   // drives reflections on all PBR materials
        hdr.dispose();
        pmrem.dispose();
        resolve();
      },
    );
  });
}

// ─── AO shadow decal (soft car shadow baked) ─────────────────────────────────

new THREE.TextureLoader().load(
  'https://threejs.org/examples/models/gltf/ferrari_ao.png',
  (tex) => {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
      new THREE.MeshBasicMaterial({
        map: tex,
        blending: THREE.MultiplyBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.7,
      }),
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = 0.003;
    scene.add(decal);
  },
);

// ─── GLTF model ───────────────────────────────────────────────────────────────

function loadCar() {
  const progEl = document.getElementById('prog');

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');

  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  gltfLoader.load(
    'https://threejs.org/examples/models/gltf/ferrari.glb',
    (gltf) => {
      const model = gltf.scene;

      // Assign custom materials by known mesh name
      const body  = model.getObjectByName('body');
      const glass = model.getObjectByName('glass');
      const trim  = model.getObjectByName('trim');

      if (body)  body.material  = bodyMat;
      if (glass) glass.material = glassMat;
      if (trim)  trim.material  = trimMat;

      // All four rims share the same material instance
      ['rim_fl', 'rim_fr', 'rim_rr', 'rim_rl'].forEach((name) => {
        const rim = model.getObjectByName(name);
        if (rim) rim.material = rimMat;
      });

      // Enable shadows on every mesh in the model
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(model);
      document.getElementById('overlay').classList.add('gone');
    },
    ({ loaded, total }) => {
      if (total > 0) progEl.textContent = `Loading model… ${Math.round(loaded / total * 100)}%`;
    },
    (err) => console.error('GLTF error:', err),
  );
}

// ─── Bootstrap (env first, then model) ───────────────────────────────────────

initEnvironment().then(loadCar);

// ─── UI helpers ───────────────────────────────────────────────────────────────

function setActive(container, el) {
  container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// Body color swatches
const swatchesEl  = document.getElementById('swatches');
const pickerEl    = document.getElementById('colorPicker');
const colorNameEl = document.getElementById('colorName');

BODY_PRESETS.forEach((p, i) => {
  const btn = document.createElement('button');
  btn.className = 'swatch' + (i === 0 ? ' active' : '');
  btn.style.background = p.hex;
  btn.title = p.name;
  btn.addEventListener('click', () => {
    bodyMat.color.set(p.hex);
    colorNameEl.textContent = p.name;
    pickerEl.value = p.hex;
    setActive(swatchesEl, btn);
  });
  swatchesEl.appendChild(btn);
});

pickerEl.addEventListener('input', (e) => {
  bodyMat.color.set(e.target.value);
  colorNameEl.textContent = 'Custom';
  swatchesEl.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
});

// Wheel buttons
const wheelEl = document.getElementById('wheelBtns');

WHEEL_PRESETS.forEach((p, i) => {
  const btn = document.createElement('button');
  btn.className = 'opt' + (i === 0 ? ' active' : '');
  btn.innerHTML = `<span class="opt-dot" style="background:${p.color}"></span>${p.label}`;
  btn.addEventListener('click', () => {
    rimMat.color.set(p.color);
    rimMat.metalness = p.metalness;
    rimMat.roughness = p.roughness;
    rimMat.needsUpdate = true;
    setActive(wheelEl, btn);
  });
  wheelEl.appendChild(btn);
});

// Interior buttons
const interiorEl = document.getElementById('interiorBtns');

INTERIOR_PRESETS.forEach((p, i) => {
  const btn = document.createElement('button');
  btn.className = 'opt' + (i === 0 ? ' active' : '');
  btn.innerHTML = `<span class="opt-dot" style="background:${p.color}"></span>${p.label}`;
  btn.addEventListener('click', () => {
    trimMat.color.set(p.color);
    trimMat.roughness = p.roughness;
    trimMat.metalness = p.metalness ?? 0;
    trimMat.needsUpdate = true;
    setActive(interiorEl, btn);
  });
  interiorEl.appendChild(btn);
});

// Save render
document.getElementById('saveBtn').addEventListener('click', () => {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = `ferrari-${Date.now()}.png`;
  link.click();
});

// ─── Animation loop ───────────────────────────────────────────────────────────

(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}());

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
