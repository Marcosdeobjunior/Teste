import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Scene setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0008);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Star field — 10,000 particles
const STAR_COUNT = 10000;
const SPREAD = 1000;

const positions = new Float32Array(STAR_COUNT * 3);
const colors = new Float32Array(STAR_COUNT * 3);
const sizes = new Float32Array(STAR_COUNT);

const colorOptions = [
  new THREE.Color(1.0, 1.0, 1.0),   // white
  new THREE.Color(0.8, 0.9, 1.0),   // blue-white
  new THREE.Color(1.0, 0.9, 0.7),   // warm yellow
  new THREE.Color(0.7, 0.8, 1.0),   // blue
  new THREE.Color(1.0, 0.7, 0.6),   // red-orange
];

for (let i = 0; i < STAR_COUNT; i++) {
  const i3 = i * 3;
  positions[i3]     = (Math.random() - 0.5) * SPREAD;
  positions[i3 + 1] = (Math.random() - 0.5) * SPREAD;
  positions[i3 + 2] = (Math.random() - 0.5) * SPREAD;

  const c = colorOptions[Math.floor(Math.random() * colorOptions.length)];
  colors[i3]     = c.r;
  colors[i3 + 1] = c.g;
  colors[i3 + 2] = c.b;

  sizes[i] = Math.random() * 2.5 + 0.5;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

// Circular soft-glow sprite via canvas
function makeStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0,    'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const material = new THREE.PointsMaterial({
  vertexColors: true,
  size: 1.5,
  sizeAttenuation: true,
  map: makeStarTexture(),
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

const stars = new THREE.Points(geometry, material);
scene.add(stars);

// Mouse steering
const mouse = new THREE.Vector2();
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

// Speed control via scroll
let speed = 0.8;
window.addEventListener('wheel', (e) => {
  speed = THREE.MathUtils.clamp(speed + e.deltaY * 0.001, 0.1, 5);
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
const targetRotation = new THREE.Euler();
const currentRotation = new THREE.Euler();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Fly forward through the star field
  camera.position.z -= speed * delta * 30;

  // Wrap stars that pass behind the camera back to the front
  const pos = geometry.attributes.position.array;
  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    if (pos[i3 + 2] > camera.position.z + 50) {
      pos[i3 + 2] -= SPREAD;
    }
  }
  geometry.attributes.position.needsUpdate = true;

  // Smooth camera steering toward mouse
  targetRotation.x = -mouse.y * 0.3;
  targetRotation.y = -mouse.x * 0.3;
  currentRotation.x += (targetRotation.x - currentRotation.x) * 0.05;
  currentRotation.y += (targetRotation.y - currentRotation.y) * 0.05;
  camera.rotation.x = currentRotation.x;
  camera.rotation.y = currentRotation.y;

  // Subtle slow rotation of the whole field for atmosphere
  stars.rotation.z += delta * 0.01;

  renderer.render(scene, camera);
}

animate();
