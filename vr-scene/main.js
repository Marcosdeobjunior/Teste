import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { VRButton }                from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory }       from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/XRHandModelFactory.js';
import { OrbitControls }            from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// ── Renderer ──────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ── Scene ─────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010112);
scene.fog = new THREE.FogExp2(0x010112, 0.03);

// ── Camera + Player Rig ───────────────────────────────────────────────────
// All VR/controller objects live inside playerRig — move rig to teleport.
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 1.6, 5);

const playerRig = new THREE.Group();
playerRig.add(camera);
scene.add(playerRig);

// ── Desktop Orbit Controls ────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

renderer.xr.addEventListener('sessionstart', () => { controls.enabled = false; });
renderer.xr.addEventListener('sessionend',   () => { controls.enabled = true; });

// ── Lighting ──────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x223366, 2));

const sun = new THREE.DirectionalLight(0x8899ff, 3);
sun.position.set(5, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(2048);
scene.add(sun);

[{ c: 0x0066ff, p: [-4, 1, -4] },
 { c: 0xff3300, p: [4, 1, -4] },
 { c: 0x00ff99, p: [0, 2, -9] },
].forEach(({ c, p }) => {
  const l = new THREE.PointLight(c, 3, 14);
  l.position.set(...p);
  scene.add(l);
});

// ── Floor ─────────────────────────────────────────────────────────────────
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0x0a1428, metalness: 0.85, roughness: 0.25 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(20, 20, 0x113366, 0x081133));

// ── Teleport Pads (decorative landing spots) ──────────────────────────────
const padMeshes = [
  [0, 0, -3], [-3, 0, -3], [3, 0, -3],
  [-3, 0, -7], [0, 0, -7], [3, 0, -7],
].map(([x, y, z]) => {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32),
    new THREE.MeshStandardMaterial({ color: 0x0066cc, emissive: 0x002266, metalness: 0.9, roughness: 0.1 })
  );
  m.position.set(x, y, z);
  scene.add(m);
  return m;
});

// ── Floating Orbs ─────────────────────────────────────────────────────────
const orbMeshes = [0xff3355, 0x33ff88, 0x3388ff, 0xffaa22, 0xff33cc].map((color, i) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 32, 32),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 })
  );
  const a = (i / 5) * Math.PI * 2;
  m.position.set(Math.cos(a) * 2.5, 1.6, Math.sin(a) * 2.5 - 3);
  m.castShadow = true;
  scene.add(m);
  return m;
});

// ── Stars ─────────────────────────────────────────────────────────────────
{
  const N = 2500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 80;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 80;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, sizeAttenuation: true })));
}

// ── Teleport Destination Marker ───────────────────────────────────────────
const teleportMarker = new THREE.Mesh(
  new THREE.RingGeometry(0.15, 0.3, 32),
  new THREE.MeshBasicMaterial({ color: 0x00ffaa, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
);
teleportMarker.rotation.x = -Math.PI / 2;
teleportMarker.visible = false;
scene.add(teleportMarker);

// ── Controller Ray Line ───────────────────────────────────────────────────
function makeRayLine() {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.7 }));
  line.visible = false;
  return line;
}

// ── XR Controllers ────────────────────────────────────────────────────────
// Squeeze (grip button) → show aim ray
// Release squeeze       → teleport to highlighted spot
const ctrlModelFactory = new XRControllerModelFactory();
const ctrlStates = [];

for (let i = 0; i < 2; i++) {
  const ctrl = renderer.xr.getController(i);
  const grip = renderer.xr.getControllerGrip(i);
  grip.add(ctrlModelFactory.createControllerModel(grip));

  const ray = makeRayLine();
  ctrl.add(ray);
  playerRig.add(ctrl, grip);

  const s = { ctrl, ray, aiming: false, target: null };
  ctrlStates.push(s);

  ctrl.addEventListener('squeezestart', () => {
    s.aiming = true;
    ray.visible = true;
  });
  ctrl.addEventListener('squeezeend', () => {
    if (s.target) teleport(s.target);
    s.aiming = false;
    s.target = null;
    ray.visible = false;
    teleportMarker.visible = false;
  });
}

// ── XR Hand Tracking ─────────────────────────────────────────────────────
// Point index finger at floor → pinch → teleport
const handModelFactory = new XRHandModelFactory();
const handRaycaster = new THREE.Raycaster();

for (let i = 0; i < 2; i++) {
  const hand = renderer.xr.getHand(i);
  hand.add(handModelFactory.createHandModel(hand, 'spheres'));
  playerRig.add(hand);

  hand.addEventListener('pinchend', () => {
    const tip  = hand.joints['index-finger-tip'];
    const prox = hand.joints['index-finger-proximal'];
    if (!tip || !prox) return;

    // Cast ray from tip in the finger's pointing direction
    const tipPos  = new THREE.Vector3().setFromMatrixPosition(tip.matrixWorld);
    const proxPos = new THREE.Vector3().setFromMatrixPosition(prox.matrixWorld);

    handRaycaster.ray.origin.copy(tipPos);
    handRaycaster.ray.direction.subVectors(tipPos, proxPos).normalize();

    const hits = handRaycaster.intersectObject(floor);
    if (hits.length > 0) teleport(hits[0].point);
  });
}

// ── Teleport ──────────────────────────────────────────────────────────────
function teleport(position) {
  playerRig.position.x = position.x;
  playerRig.position.z = position.z;
}

// ── Controller Aim Raycasting (runs each frame while aiming) ──────────────
const aimRaycaster = new THREE.Raycaster();
const tempMatrix   = new THREE.Matrix4();

function updateAim() {
  let anyAiming = false;

  for (const s of ctrlStates) {
    if (!s.aiming) continue;
    anyAiming = true;

    tempMatrix.identity().extractRotation(s.ctrl.matrixWorld);
    aimRaycaster.ray.origin.setFromMatrixPosition(s.ctrl.matrixWorld);
    aimRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix).normalize();

    const hits = aimRaycaster.intersectObject(floor);
    if (hits.length > 0) {
      s.target = hits[0].point.clone();
      teleportMarker.position.copy(hits[0].point);
      teleportMarker.position.y = 0.02;
      teleportMarker.visible = true;
      s.ray.scale.z = hits[0].distance;
    } else {
      s.target = null;
      s.ray.scale.z = 5;
    }
  }

  if (!anyAiming) teleportMarker.visible = false;
}

// ── Resize ────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation Loop (setAnimationLoop required for WebXR) ──────────────────
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();

  // Orbit and float the orbs
  orbMeshes.forEach((orb, i) => {
    const a = (i / orbMeshes.length) * Math.PI * 2 + t * 0.35;
    orb.position.x = Math.cos(a) * 2.5;
    orb.position.z = Math.sin(a) * 2.5 - 3;
    orb.position.y = 1.6 + Math.sin(t * 1.2 + i) * 0.22;
    orb.rotation.y = t * 0.8;
  });

  // Pulse teleport pads
  padMeshes.forEach((pad, i) => {
    pad.material.emissiveIntensity = 0.2 + 0.15 * Math.sin(t * 2 + i * 1.1);
  });

  updateAim();

  if (!renderer.xr.isPresenting) controls.update();

  renderer.render(scene, camera);
});
