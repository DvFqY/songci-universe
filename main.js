import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ===== STATE =====
let entered = false;
let scene, camera, renderer, labelRenderer, controls;
let starMeshes = [];
let raycaster, pointer;
let selectedStar = null;
let isTransitioning = false;
let targetCamPos = null;
let camAnimating = false;
let camAnimStart = null;
let camAnimDuration = 1.5;

// ===== DOM REFS =====
const landingOverlay = document.getElementById('landing-overlay');
const universeUI = document.getElementById('universe-ui');
const poemModal = document.getElementById('poem-modal');
const starCount = document.getElementById('starCount');
const toast = document.getElementById('toast');

// ===== INIT THREE.JS =====
function initScene() {
  const container = document.getElementById('universe-container');

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 5, 25);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 60;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.target.set(0, 0, 0);
  controls.update();

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
}

// ===== CREATE UNIVERSE =====
function createUniverse() {
  // Ambient light
  const ambient = new THREE.AmbientLight(0x222244, 0.5);
  scene.add(ambient);

  // Point light
  const light = new THREE.PointLight(0x8888ff, 1, 100);
  light.position.set(0, 10, 20);
  scene.add(light);

  // Background nebula particles
  const bgCount = 8000;
  const bgGeo = new THREE.BufferGeometry();
  const bgPos = new Float32Array(bgCount * 3);
  const bgColors = new Float32Array(bgCount * 3);
  const bgSizes = new Float32Array(bgCount);

  for (let i = 0; i < bgCount; i++) {
    const r = 50 + Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    bgPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    bgPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    bgPos[i*3+2] = r * Math.cos(phi);

    const c = new THREE.Color().setHSL(0.65 + Math.random() * 0.15, 0.5, 0.3 + Math.random() * 0.3);
    bgColors[i*3] = c.r; bgColors[i*3+1] = c.g; bgColors[i*3+2] = c.b;
    bgSizes[i] = 0.3 + Math.random() * 0.8;
  }
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
  bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
  bgGeo.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));

  const bgMat = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const bgParticles = new THREE.Points(bgGeo, bgMat);
  scene.add(bgParticles);

  // Inner glow particles
  const glowCount = 2000;
  const glowGeo = new THREE.BufferGeometry();
  const glowPos = new Float32Array(glowCount * 3);
  for (let i = 0; i < glowCount; i++) {
    const r = 5 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    glowPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    glowPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    glowPos[i*3+2] = r * Math.cos(phi);
  }
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  const glowMat = new THREE.PointsMaterial({
    size: 0.08,
    color: 0x8888ff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const glowParticles = new THREE.Points(glowGeo, glowMat);
  scene.add(glowParticles);

  // Central glow
  const glowSphere = new THREE.Mesh(
    new THREE.SphereGeometry(2, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x4444aa,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending
    })
  );
  scene.add(glowSphere);

  // ===== CREATE POEM STARS =====
  const starColors = [0x6366f1, 0xa855f7, 0xec4899, 0xf59e0b, 0x34d399, 0x60a5fa, 0xf472b6, 0x818cf8];

  POEMS.forEach((poem, i) => {
    const radius = 8 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    // Star glow sprite
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 128;
    spriteCanvas.height = 128;
    const ctx = spriteCanvas.getContext('2d');

    const color = new THREE.Color(starColors[i % starColors.length]);
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${color.r*255|0},${color.g*255|0},${color.b*255|0},1)`);
    gradient.addColorStop(0.2, `rgba(${color.r*255|0},${color.g*255|0},${color.b*255|0},0.8)`);
    gradient.addColorStop(0.5, `rgba(${color.r*255|0},${color.g*255|0},${color.b*255|0},0.3)`);
    gradient.addColorStop(1, `rgba(${color.r*255|0},${color.g*255|0},${color.b*255|0},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    // Cross flare
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(${color.r*255|0},${color.g*255|0},${color.b*255|0},0.3)`;
    ctx.fillRect(56, 20, 16, 88);
    ctx.fillRect(20, 56, 88, 16);
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(spriteCanvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.9
    });
    const sprite = new THREE.Sprite(spriteMat);
    const size = 0.8 + Math.random() * 0.6;
    sprite.scale.set(size, size, 1);
    sprite.position.set(x, y, z);
    sprite.userData = { poem, isPoemStar: true, baseSize: size, pulseOffset: Math.random() * Math.PI * 2 };
    scene.add(sprite);
    starMeshes.push(sprite);

    // Label
    const labelDiv = document.createElement('div');
    labelDiv.textContent = poem.title;
    labelDiv.style.color = `rgba(${color.r*255|0},${color.g*255|0},${color.b*255|0},0.7)`;
    labelDiv.style.fontFamily = "'Ma Shan Zheng', cursive";
    labelDiv.style.fontSize = '14px';
    labelDiv.style.textShadow = '0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)';
    labelDiv.style.letterSpacing = '2px';
    labelDiv.style.whiteSpace = 'nowrap';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.transition = 'opacity 0.3s';

    const label = new CSS2DObject(labelDiv);
    label.position.set(x, y - size * 0.8, z);
    scene.add(label);
  });
}

// ===== RAYCASTER INTERACTION =====
function onPointerDown(event) {
  if (!entered || isTransitioning) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(starMeshes);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    if (hit.userData.isPoemStar) {
      controls.autoRotate = false;
      openPoem(hit.userData.poem);
    }
  }
}

function onPointerMove(event) {
  if (!entered) return;

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(starMeshes);

  renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';

  if (selectedStar && selectedStar !== (intersects.length > 0 ? intersects[0].object : null)) {
    const prev = selectedStar;
    prev.userData.hoverScale = 1;
  }

  if (intersects.length > 0) {
    selectedStar = intersects[0].object;
    selectedStar.userData.hoverScale = 1.8;
  } else {
    selectedStar = null;
  }
}

// ===== LANDING ENTRY =====
function enterUniverse() {
  if (isTransitioning) return;
  isTransitioning = true;

  landingOverlay.classList.add('fade-out');
  universeUI.classList.remove('hidden');

  setTimeout(() => {
    landingOverlay.style.display = 'none';
    entered = true;
    isTransitioning = false;
    controls.autoRotate = true;
    updateStarCount();
    showToast('✦ 点击任意星辰，品读千年宋词');
    setTimeout(() => hideToast(), 2500);
  }, 1500);
}

landingOverlay.addEventListener('dblclick', enterUniverse);

// ===== POEM MODAL =====
function openPoem(poem) {
  document.getElementById('poemIntro').textContent = poem.intro;
  document.getElementById('poemTitle').textContent = poem.title;
  document.getElementById('poemAuthor').textContent = poem.author;
  document.getElementById('poemDynasty').textContent = `—— ${poem.dynasty} · ${poem.author}`;
  document.getElementById('poemText').textContent = poem.text;
  poemModal.classList.remove('hidden');
}

function closePoem() {
  poemModal.classList.add('hidden');
  setTimeout(() => { controls.autoRotate = true; }, 500);
}

document.getElementById('modalClose').addEventListener('click', closePoem);
document.querySelector('.modal-backdrop').addEventListener('click', closePoem);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePoem();
});

// ===== BACK BUTTON =====
document.getElementById('btnBack').addEventListener('click', () => {
  if (isTransitioning) return;
  isTransitioning = true;
  entered = false;
  controls.autoRotate = false;

  universeUI.classList.add('hidden');
  landingOverlay.style.display = 'flex';
  landingOverlay.classList.remove('fade-out');

  // Animate camera back using lerp
  targetCamPos = new THREE.Vector3(0, 5, 25);
  camAnimating = true;
  camAnimStart = performance.now();
  camAnimDuration = 1500;
  controls.target.set(0, 0, 0);
});

// ===== TOAST =====
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('show');
}
function hideToast() {
  toast.classList.remove('show');
  toast.classList.add('hidden');
}

// ===== STAR COUNT =====
function updateStarCount() {
  const discovered = parseInt(starCount.dataset.discovered || '0');
  starCount.textContent = `✨ ${discovered} / ${POEMS.length} 颗诗星`;
}

// ===== WINDOW RESIZE =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== ANIMATION LOOP =====
function animate() {
  requestAnimationFrame(animate);

  const time = Date.now() * 0.001;

  // Camera animation (lerp back)
  if (camAnimating && targetCamPos) {
    const elapsed = performance.now() - camAnimStart;
    const t = Math.min(elapsed / camAnimDuration, 1);
    // Smooth easeInOut
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    camera.position.lerp(targetCamPos, ease * 0.08);
    if (t >= 1) {
      camera.position.copy(targetCamPos);
      camAnimating = false;
      targetCamPos = null;
      isTransitioning = false;
    }
  }

  // Pulse poem stars
  starMeshes.forEach(sprite => {
    if (sprite.userData.isPoemStar) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.5 + sprite.userData.pulseOffset);
      const hover = sprite.userData.hoverScale || 1;
      const targetScale = sprite.userData.baseSize * pulse * hover;
      sprite.scale.x += (targetScale - sprite.scale.x) * 0.1;
      sprite.scale.y += (targetScale - sprite.scale.y) * 0.1;
      sprite.material.opacity = 0.6 + 0.3 * Math.sin(time * 1.2 + sprite.userData.pulseOffset);
    }
  });

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// ===== INIT =====
initScene();
createUniverse();

// Events
renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointermove', onPointerMove);

// Start
animate();
