// ===== STATE =====
let entered = false;
let scene, camera, renderer;
let starMeshes = [], bgParticles, glowParticles;
let raycaster, mouse;
let selectedStar = null;
let isTransitioning = false;
let mouseX = 0, mouseY = 0;
let autoRotate = true;
let autoRotateAngle = 0;

const landingOverlay = document.getElementById('landing-overlay');
const universeUI = document.getElementById('universe-ui');
const poemModal = document.getElementById('poem-modal');
const toast = document.getElementById('toast');

// ===== SIMPLE ORBIT CONTROLS =====
let camTheta = 0, camPhi = Math.PI / 3, camDist = 35;
let targetTheta = 0, targetPhi = Math.PI / 3, targetDist = 35;
let isDragging = false;
let prevMouseX = 0, prevMouseY = 0;

function initScene() {
  const container = document.getElementById('universe-container');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  updateCameraPosition();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Mouse drag for orbit
  renderer.domElement.addEventListener('mousedown', (e) => {
    if (!entered) return;
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    autoRotate = false;
  });

  document.addEventListener('mousemove', (e) => {
    if (!entered) return;
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

    if (isDragging) {
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      targetTheta -= dx * 0.005;
      targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, targetPhi + dy * 0.005));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Scroll to zoom
  renderer.domElement.addEventListener('wheel', (e) => {
    if (!entered) return;
    targetDist = Math.max(12, Math.min(60, targetDist + e.deltaY * 0.02));
  });
}

function updateCameraPosition() {
  camTheta += (targetTheta - camTheta) * 0.08;
  camPhi += (targetPhi - camPhi) * 0.08;
  camDist += (targetDist - camDist) * 0.08;

  camera.position.x = camDist * Math.sin(camPhi) * Math.cos(camTheta);
  camera.position.y = camDist * Math.cos(camPhi);
  camera.position.z = camDist * Math.sin(camPhi) * Math.sin(camTheta);
  camera.lookAt(0, 0, 0);
}

// ===== PARTICLE UNIVERSE (First Version) =====
function createParticleUniverse() {
  // Layer 1: Main spherical particles (3000)
  const count = 3000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const color1 = new THREE.Color(0x6366f1);
  const color2 = new THREE.Color(0xa855f7);
  const color3 = new THREE.Color(0xec4899);

  for (let i = 0; i < count; i++) {
    const radius = 20 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    const color = Math.random() > 0.5
      ? color1.clone().lerp(color2, Math.random())
      : color2.clone().lerp(color3, Math.random());
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
    sizes[i] = 0.1 + Math.random() * 0.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const texCanvas = document.createElement('canvas');
  texCanvas.width = 64; texCanvas.height = 64;
  const ctx = texCanvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(texCanvas);

  const material = new THREE.PointsMaterial({
    size: 0.25, map: texture, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, vertexColors: true,
    opacity: 0.8, sizeAttenuation: true
  });
  bgParticles = new THREE.Points(geometry, material);
  scene.add(bgParticles);

  // Layer 2: Tiny background dust (1500)
  const count2 = 1500;
  const pos2 = new Float32Array(count2 * 3);
  for (let i = 0; i < count2; i++) {
    pos2[i * 3] = (Math.random() - 0.5) * 80;
    pos2[i * 3 + 1] = (Math.random() - 0.5) * 80;
    pos2[i * 3 + 2] = (Math.random() - 0.5) * 40 - 10;
  }
  const geo2 = new THREE.BufferGeometry();
  geo2.setAttribute('position', new THREE.BufferAttribute(pos2, 3));
  const mat2 = new THREE.PointsMaterial({
    size: 0.08, color: 0x6366f1, transparent: true, opacity: 0.25,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  glowParticles = new THREE.Points(geo2, mat2);
  scene.add(glowParticles);
}

// ===== CREATE POEM STARS =====
function createPoemStars() {
  const starColors = [0x6366f1, 0xa855f7, 0xec4899, 0xf59e0b, 0x34d399, 0x60a5fa, 0xf472b6, 0x818cf8];

  POEMS.forEach((poem, i) => {
    const radius = 10 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    const color = new THREE.Color(starColors[i % starColors.length]);

    // Star sprite
    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.1, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(48, 48, 48, 0, Math.PI * 2); ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, opacity: 0.85,
      color: color
    });
    const sprite = new THREE.Sprite(spriteMat);
    const size = 0.7 + Math.random() * 0.5;
    sprite.scale.set(size, size, 1);
    sprite.position.set(x, y, z);
    sprite.userData = {
      poem, isPoemStar: true, baseSize: size,
      pulseOffset: Math.random() * Math.PI * 2,
      hoverScale: 1
    };
    scene.add(sprite);
    starMeshes.push(sprite);
  });
}

// ===== ENTRY =====
function enterUniverse() {
  if (isTransitioning || entered) return;
  isTransitioning = true;
  landingOverlay.classList.add('fade-out');
  universeUI.classList.remove('hidden');
  setTimeout(() => {
    landingOverlay.style.display = 'none';
    entered = true;
    isTransitioning = false;
    autoRotate = true;
    showToast('✦ 点击星辰，品读宋词');
    setTimeout(hideToast, 2000);
  }, 1200);
}

landingOverlay.addEventListener('dblclick', enterUniverse);

// ===== CLICK STAR =====
function onPointerDown(event) {
  if (!entered || isTransitioning) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes);
  if (intersects.length > 0 && intersects[0].object.userData.isPoemStar) {
    autoRotate = false;
    openPoem(intersects[0].object.userData.poem);
  }
}

function onPointerMove(event) {
  if (!entered) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(starMeshes);
  renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'default';

  if (selectedStar && selectedStar !== (intersects.length > 0 ? intersects[0].object : null)) {
    selectedStar.userData.hoverScale = 1;
  }
  if (intersects.length > 0) {
    selectedStar = intersects[0].object;
    selectedStar.userData.hoverScale = 2.2;
  } else {
    selectedStar = null;
  }
}

// ===== POEM MODAL =====
function openPoem(poem) {
  document.getElementById('poemIntro').textContent = poem.intro;
  document.getElementById('poemTitle').textContent = poem.title;
  document.getElementById('poemAuthorLine').textContent = poem.dynasty + ' · ' + poem.author;
  document.getElementById('poemText').textContent = poem.text;
  poemModal.classList.remove('hidden');
}

function closePoem() {
  poemModal.classList.add('hidden');
  setTimeout(() => { autoRotate = true; }, 500);
}

document.getElementById('modalClose').addEventListener('click', closePoem);
document.querySelector('.modal-backdrop').addEventListener('click', closePoem);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePoem(); });

// ===== BACK =====
document.getElementById('btnBack').addEventListener('click', () => {
  if (isTransitioning) return;
  isTransitioning = true;
  entered = false;
  autoRotate = false;
  universeUI.classList.add('hidden');
  landingOverlay.style.display = 'flex';
  landingOverlay.classList.remove('fade-out');
  targetTheta = 0; targetPhi = Math.PI / 3; targetDist = 35;
  camTheta = 0; camPhi = Math.PI / 3; camDist = 35;
  isTransitioning = false;
});

// ===== TOAST =====
function showToast(msg) { toast.textContent = msg; toast.classList.remove('hidden'); toast.classList.add('show'); }
function hideToast() { toast.classList.remove('show'); toast.classList.add('hidden'); }

// ===== RESIZE =====
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== ANIMATION LOOP =====
function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;

  // Auto rotate
  if (autoRotate && !isDragging) {
    targetTheta += 0.002;
  }

  // Mouse parallax on particles
  if (bgParticles) {
    bgParticles.rotation.x += (mouseY * 0.12 - bgParticles.rotation.x) * 0.02;
    bgParticles.rotation.y += (mouseX * 0.12 - bgParticles.rotation.y) * 0.02;
  }
  if (glowParticles) {
    glowParticles.rotation.y += 0.0003;
  }

  // Pulse & hover stars
  starMeshes.forEach(sprite => {
    if (sprite.userData.isPoemStar) {
      const pulse = 0.85 + 0.15 * Math.sin(time * 1.5 + sprite.userData.pulseOffset);
      const hover = sprite.userData.hoverScale || 1;
      const target = sprite.userData.baseSize * pulse * hover;
      sprite.scale.x += (target - sprite.scale.x) * 0.1;
      sprite.scale.y += (target - sprite.scale.y) * 0.1;
      sprite.material.opacity = 0.5 + 0.35 * Math.sin(time * 1.2 + sprite.userData.pulseOffset);
    }
  });

  updateCameraPosition();
  renderer.render(scene, camera);
}

// ===== INIT =====
initScene();
createParticleUniverse();
createPoemStars();

renderer.domElement.addEventListener('click', onPointerDown);
renderer.domElement.addEventListener('mousemove', onPointerMove);

animate();
