import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ── SCENE ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040807);
scene.fog = new THREE.FogExp2(0x040807, 0.0055);

// ── CAMERA ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 600);
camera.position.set(0, 9, 65);
camera.lookAt(0, 5, 0);

// ── RENDERER ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

// ── LIGHTS ───────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x060e06, 2.2));

const moon = new THREE.DirectionalLight(0x8899bb, 0.55);
moon.position.set(-25, 60, 20);
scene.add(moon);

// Warm lantern glow along the path
const lanterns = [
  [10, 4, -8], [-10, 4, -14], [9, 4, -36], [-9, 4, -44],
  [10, 4, -64], [-11, 4, -72], [0, 6, -100],
];
lanterns.forEach(([x, y, z]) => {
  const l = new THREE.PointLight(0x3a2808, 3.5, 28);
  l.position.set(x, y, z);
  scene.add(l);
});

// ── GROUND ───────────────────────────────────────────────────────────────────
const groundGeo = new THREE.PlaneGeometry(500, 500, 120, 120);
const gPos = groundGeo.attributes.position;
for (let i = 0; i < gPos.count; i++) {
  const x = gPos.getX(i);
  const z = gPos.getZ(i);
  gPos.setY(i,
    Math.sin(x * 0.09) * Math.cos(z * 0.07) * 0.9 +
    Math.sin(x * 0.22 + z * 0.18) * 0.35 +
    (Math.random() - 0.5) * 0.25
  );
}
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: 0x050c04 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.5;
scene.add(ground);

// Garden path (gravel)
const path = new THREE.Mesh(
  new THREE.PlaneGeometry(7, 240),
  new THREE.MeshLambertMaterial({ color: 0x090e07 })
);
path.rotation.x = -Math.PI / 2;
path.position.set(0, -0.44, -80);
scene.add(path);

// ── TREE BUILDER ─────────────────────────────────────────────────────────────
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x100a03 });
const foliageMats = [
  new THREE.MeshLambertMaterial({ color: 0x050e03, transparent: true, opacity: 0.93 }),
  new THREE.MeshLambertMaterial({ color: 0x071203, transparent: true, opacity: 0.93 }),
  new THREE.MeshLambertMaterial({ color: 0x041003, transparent: true, opacity: 0.9 }),
];

function makeTree(x, z, h = 22, r = 3.5) {
  const g = new THREE.Group();
  const s = 0.8 + Math.random() * 0.5;
  const th = h * s, tr = r * s;
  const mat = foliageMats[Math.floor(Math.random() * 3)];

  // Trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(tr * 0.1, tr * 0.17, th * 0.44, 7),
    trunkMat
  );
  trunk.position.y = th * 0.22;
  g.add(trunk);

  // Foliage clusters
  [
    [0,          th * 0.52, 0,           tr],
    [0,          th * 0.67, 0,           tr * 0.76],
    [0,          th * 0.80, 0,           tr * 0.56],
    [0,          th * 0.90, 0,           tr * 0.36],
    [ tr * 0.54, th * 0.47,  tr * 0.18,  tr * 0.5],
    [-tr * 0.48, th * 0.45, -tr * 0.12,  tr * 0.46],
    [ tr * 0.2,  th * 0.44, -tr * 0.5,   tr * 0.43],
  ].forEach(([fx, fy, fz, fr]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(fr, 7, 6), mat);
    f.position.set(fx, fy, fz);
    g.add(f);
  });

  g.position.set(x, 0, z);
  g.rotation.y = Math.random() * Math.PI * 2;
  return g;
}

// Alley trees flanking the path
for (let zi = 0; zi >= -130; zi -= 14) {
  const jitter = Math.random() * 3;
  scene.add(makeTree( 9 + jitter, zi, 24, 3.8));
  scene.add(makeTree(-9 - jitter, zi, 24, 3.8));
  if (Math.random() > 0.45) {
    scene.add(makeTree(17 + Math.random() * 6, zi + Math.random() * 7, 18, 3));
    scene.add(makeTree(-17 - Math.random() * 6, zi + Math.random() * 7, 18, 3));
  }
}

// Deep background forest
for (let i = 0; i < 90; i++) {
  scene.add(makeTree(
    (Math.random() - 0.5) * 340,
    -55 - Math.random() * 240,
    14 + Math.random() * 22,
    2.8 + Math.random() * 4
  ));
}

// Undergrowth bushes
const bushMat = new THREE.MeshLambertMaterial({ color: 0x03100a, transparent: true, opacity: 0.88 });
for (let i = 0; i < 70; i++) {
  const side = Math.random() < 0.5 ? 1 : -1;
  const bx = side * (5.5 + Math.random() * 22);
  const bz = Math.random() * -110;
  const br = 1.4 + Math.random() * 2.2;
  const bush = new THREE.Mesh(new THREE.SphereGeometry(br, 7, 5), bushMat);
  bush.position.set(bx, br * 0.58 - 0.5, bz);
  bush.scale.y = 0.55 + Math.random() * 0.3;
  scene.add(bush);
}

// ── FIREFLIES ────────────────────────────────────────────────────────────────
const FF = 200;
const ffGeo = new THREE.BufferGeometry();
const ffPos   = new Float32Array(FF * 3);
const ffPhase = new Float32Array(FF);

for (let i = 0; i < FF; i++) {
  ffPos[i*3  ] = (Math.random() - 0.5) * 60;
  ffPos[i*3+1] = 1.2 + Math.random() * 14;
  ffPos[i*3+2] = Math.random() * -110;
  ffPhase[i]   = Math.random() * Math.PI * 2;
}
ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const ffMat = new THREE.PointsMaterial({
  size: 0.32, color: 0x88ff55, transparent: true, opacity: 0.85, depthWrite: false,
});
const fireflies = new THREE.Points(ffGeo, ffMat);
scene.add(fireflies);

// ── GROUND MIST ──────────────────────────────────────────────────────────────
const MIST = 5000;
const mistGeo = new THREE.BufferGeometry();
const mistPos = new Float32Array(MIST * 3);
for (let i = 0; i < MIST; i++) {
  mistPos[i*3  ] = (Math.random() - 0.5) * 220;
  mistPos[i*3+1] = Math.random() * 7;
  mistPos[i*3+2] = Math.random() * -220;
}
mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
scene.add(new THREE.Points(mistGeo, new THREE.PointsMaterial({
  size: 2.8, color: 0x6a8a6a, transparent: true, opacity: 0.065, depthWrite: false,
})));

// ── FLOATING POLLEN / DUST ────────────────────────────────────────────────────
const POLLEN = 3000;
const polGeo  = new THREE.BufferGeometry();
const polPos   = new Float32Array(POLLEN * 3);
const polPhase = new Float32Array(POLLEN);
const polSpd   = new Float32Array(POLLEN);
for (let i = 0; i < POLLEN; i++) {
  polPos[i*3  ] = (Math.random() - 0.5) * 120;
  polPos[i*3+1] = Math.random() * 45;
  polPos[i*3+2] = Math.random() * -120;
  polPhase[i]   = Math.random() * Math.PI * 2;
  polSpd[i]     = 0.004 + Math.random() * 0.009;
}
polGeo.setAttribute('position', new THREE.BufferAttribute(polPos, 3));
const pollen = new THREE.Points(polGeo, new THREE.PointsMaterial({
  size: 0.22, color: 0xaabb88, transparent: true, opacity: 0.48, depthWrite: false,
}));
scene.add(pollen);

// ── FALLING LEAVES ───────────────────────────────────────────────────────────
const LEAVES = 1800;
const leafGeo   = new THREE.BufferGeometry();
const leafPos   = new Float32Array(LEAVES * 3);
const leafPhase = new Float32Array(LEAVES);
const leafSpd   = new Float32Array(LEAVES);
for (let i = 0; i < LEAVES; i++) {
  leafPos[i*3  ] = (Math.random() - 0.5) * 100;
  leafPos[i*3+1] = Math.random() * 50;
  leafPos[i*3+2] = Math.random() * -100;
  leafPhase[i]   = Math.random() * Math.PI * 2;
  leafSpd[i]     = 0.025 + Math.random() * 0.04;
}
leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
const leafPoints = new THREE.Points(leafGeo, new THREE.PointsMaterial({
  size: 0.55, color: 0x2a4a18, transparent: true, opacity: 0.65, depthWrite: false,
}));
scene.add(leafPoints);

// ── MOONBEAM VOLUMETRIC SHAFTS (simple geometry) ──────────────────────────────
const shaftMat = new THREE.MeshBasicMaterial({
  color: 0x223322, transparent: true, opacity: 0.04, depthWrite: false, side: THREE.DoubleSide,
});
for (let i = 0; i < 6; i++) {
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3, 40, 6, 1, true), shaftMat);
  shaft.position.set(
    (Math.random() - 0.5) * 40,
    20,
    -20 - Math.random() * 60
  );
  shaft.rotation.y = Math.random() * Math.PI;
  scene.add(shaft);
}

// ── MOUSE PARALLAX ────────────────────────────────────────────────────────────
let targetMX = 0, targetMY = 0;
window.addEventListener('mousemove', (e) => {
  targetMX = (e.clientX / innerWidth  - 0.5) * 2;
  targetMY = (e.clientY / innerHeight - 0.5) * 2;
});

// ── SCROLL DEPTH ─────────────────────────────────────────────────────────────
let scrollDepth = 0;
window.addEventListener('scroll', () => {
  scrollDepth = window.scrollY / (document.body.scrollHeight - innerHeight);
});

// ── ANIMATION LOOP ────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let camX = 0, camY = 9;

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Smooth camera parallax
  camX += (targetMX * 3.5 - camX) * 0.025;
  camY += (9 - targetMY * 1.8 - camY) * 0.025;
  camera.position.x = camX + Math.sin(t * 0.04) * 0.6;
  camera.position.y = camY + Math.sin(t * 0.07) * 0.3;

  // Scroll: pull camera back along path
  camera.position.z = 65 - scrollDepth * 30;
  camera.lookAt(
    camera.position.x * 0.25,
    camera.position.y * 0.25,
    camera.position.z - 80
  );

  // Firefly drift
  const fp = ffGeo.attributes.position.array;
  for (let i = 0; i < FF; i++) {
    fp[i*3  ] += Math.sin(t * 0.38 + ffPhase[i] * 1.7) * 0.018;
    fp[i*3+1] += Math.sin(t * 0.55 + ffPhase[i]      ) * 0.015;
    fp[i*3+2] += Math.cos(t * 0.28 + ffPhase[i] * 1.2) * 0.012;
    if (fp[i*3+1] < 0.8) fp[i*3+1] = 0.8;
    if (fp[i*3+1] > 16)  fp[i*3+1] = 16;
  }
  ffGeo.attributes.position.needsUpdate = true;
  ffMat.opacity = 0.55 + Math.sin(t * 1.6) * 0.3;

  // Pollen fall
  const pp = polGeo.attributes.position.array;
  for (let i = 0; i < POLLEN; i++) {
    pp[i*3  ] += Math.sin(t * 0.22 + polPhase[i]) * 0.007;
    pp[i*3+1] -= polSpd[i] * 0.25;
    pp[i*3+2] += Math.cos(t * 0.18 + polPhase[i]) * 0.005;
    if (pp[i*3+1] < 0) {
      pp[i*3  ] = (Math.random() - 0.5) * 120;
      pp[i*3+1] = 45;
      pp[i*3+2] = Math.random() * -120;
    }
  }
  polGeo.attributes.position.needsUpdate = true;

  // Leaf fall
  const lp = leafGeo.attributes.position.array;
  for (let i = 0; i < LEAVES; i++) {
    lp[i*3  ] += Math.sin(t * 0.32 + leafPhase[i]) * 0.014;
    lp[i*3+1] -= leafSpd[i];
    lp[i*3+2] += Math.cos(t * 0.25 + leafPhase[i]) * 0.01;
    if (lp[i*3+1] < -1) {
      lp[i*3  ] = (Math.random() - 0.5) * 100;
      lp[i*3+1] = 50;
      lp[i*3+2] = Math.random() * -100;
    }
  }
  leafGeo.attributes.position.needsUpdate = true;

  // Gentle mist rotation
  pollen.rotation.y = t * 0.003;

  renderer.render(scene, camera);
}
animate();

// ── RESIZE ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});
