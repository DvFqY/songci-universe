// ===== STATE =====
let entered = false;
let isTransitioning = false;
let autoRotate = true;
let mouseX = 0, mouseY = 0;

// Canvas
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W, H;

// ===== PARTICLES (3D spherical cloud) =====
const particles = [];
const PARTICLE_COUNT = 2500;

function initParticles() {
  const colors = [
    { r: 99, g: 102, b: 241 },
    { r: 168, g: 85, b: 247 },
    { r: 236, g: 72, b: 153 },
    { r: 139, g: 92, b: 246 },
    { r: 129, g: 140, b: 248 }
  ];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const radius = 150 + Math.random() * 250;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const c = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.sin(phi) * Math.sin(theta),
      z: radius * Math.cos(phi),
      r: c.r, g: c.g, b: c.b,
      size: 1 + Math.random() * 2.5,
      origX: 0, origY: 0, origZ: 0
    });
    // Store original positions for rotation
    const p = particles[i];
    p.origX = p.x;
    p.origY = p.y;
    p.origZ = p.z;
  }
}

// ===== ROTATION STATE =====
let rotX = 0, rotY = 0;
let targetRotX = 0, targetRotY = 0;
let camDist = 500;
let targetCamDist = 500;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function project3D(x, y, z) {
  const fov = 500;
  const scale = fov / (fov + z);
  return {
    sx: x * scale + W / 2,
    sy: y * scale + H / 2,
    scale: scale
  };
}

function rotateX(y, z, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { y: y * cos - z * sin, z: y * sin + z * cos };
}

function rotateY(x, z, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: x * cos + z * sin, z: -x * sin + z * cos };
}

function drawParticles() {
  // Sort by z for depth
  const sorted = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    let { y: ry, z: rz } = rotateX(p.origY, p.origZ, rotX);
    let { x: rx, z: rzz } = rotateY(p.origX, rz, rotY);
    sorted.push({ ...p, rx, ry, rz: rzz });
  }
  sorted.sort((a, b) => a.rz - b.rz);

  for (const p of sorted) {
    const { sx, sy, scale } = project3D(p.rx, p.ry, p.rz);
    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
    const alpha = Math.max(0, Math.min(1, (p.rz + 400) / 800));
    const size = p.size * scale * 1.5;
    if (size < 0.3) continue;

    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, size);
    grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha * 0.9})`);
    grad.addColorStop(0.4, `rgba(${p.r},${p.g},${p.b},${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===== POEM STARS (3D positions, projected to 2D) =====
let poemStars = [];
let selectedStarIdx = -1;

function initPoemStars() {
  const starColors = [
    '#6366f1', '#a855f7', '#ec4899', '#f59e0b',
    '#34d399', '#60a5fa', '#f472b6', '#818cf8'
  ];
  POEMS.forEach((poem, i) => {
    const radius = 120 + Math.random() * 150;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    poemStars.push({
      origX: x, origY: y, origZ: z,
      rx: 0, ry: 0, rz: 0,
      sx: 0, sy: 0, sz: 0,
      screenX: 0, screenY: 0,
      scale: 1,
      color: starColors[i % starColors.length],
      poem: poem,
      baseSize: 5 + Math.random() * 3,
      pulseOffset: Math.random() * Math.PI * 2,
      hoverScale: 1,
      isHovered: false
    });
  });
}

function updatePoemStars() {
  for (const s of poemStars) {
    let { y: ry, z: rz } = rotateX(s.origY, s.origZ, rotX);
    let { x: rx, z: rzz } = rotateY(s.origX, rz, rotY);
    s.rx = rx; s.ry = ry; s.rz = rzz;
    const proj = project3D(rx, ry, rzz);
    s.screenX = proj.sx;
    s.screenY = proj.sy;
    s.scale = proj.scale;
    s.sz = rzz;
  }
}

function drawPoemStars(time) {
  // Sort by z
  const sorted = [...poemStars].sort((a, b) => a.sz - b.sz);

  for (const s of sorted) {
    const { sx, sy, scale } = s;
    if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
    const alpha = Math.max(0.1, Math.min(1, (s.sz + 300) / 600));

    const pulse = 0.85 + 0.15 * Math.sin(time * 0.002 + s.pulseOffset);
    const hover = s.hoverScale || 1;
    const size = s.baseSize * scale * pulse * hover;

    // Glow
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
    grad.addColorStop(0, s.color.replace(')', ',0.6)').replace('rgb', 'rgba'));
    grad.addColorStop(0.5, s.color.replace(')', ',0.15)').replace('rgb', 'rgba'));
    grad.addColorStop(1, s.color.replace(')', ',0)').replace('rgb', 'rgba'));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Color ring
    ctx.fillStyle = s.color;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    if (s.sz > -200) {
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.4})`;
      ctx.font = `${12 * scale}px "KaiTi", "STKaiti", serif`;
      ctx.textAlign = 'center';
      ctx.fillText(s.poem.title, sx, sy + size * 2.5 + 14 * scale);
    }
  }
}

// ===== HIT TEST =====
function hitTest(mx, my) {
  for (let i = poemStars.length - 1; i >= 0; i--) {
    const s = poemStars[i];
    if (s.sz < -250) continue;
    const dx = mx - s.screenX;
    const dy = my - s.screenY;
    const size = s.baseSize * s.scale * (s.hoverScale || 1) * 3;
    if (dx * dx + dy * dy < size * size) {
      return i;
    }
  }
  return -1;
}

// ===== LANDING =====
const landingOverlay = document.getElementById('landing-overlay');
const universeUI = document.getElementById('universe-ui');
const poemModal = document.getElementById('poem-modal');
const toast = document.getElementById('toast');

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

// ===== MOUSE / DRAG =====
let isDragging = false;
let prevMX = 0, prevMY = 0;
let dragRotX = 0, dragRotY = 0;

canvas.addEventListener('mousedown', (e) => {
  if (!entered) return;
  isDragging = true;
  prevMX = e.clientX;
  prevMY = e.clientY;
  dragRotX = rotX;
  dragRotY = rotY;
  autoRotate = false;
});

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / W) * 2 - 1;
  mouseY = -(e.clientY / H) * 2 + 1;

  if (isDragging) {
    const dx = e.clientX - prevMX;
    const dy = e.clientY - prevMY;
    targetRotY = dragRotY + dx * 0.005;
    targetRotX = Math.max(-1.2, Math.min(1.2, dragRotX + dy * 0.005));
  }

  // Hover
  if (entered) {
    const idx = hitTest(e.clientX, e.clientY);
    canvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
    for (let i = 0; i < poemStars.length; i++) {
      poemStars[i].hoverScale = (i === idx) ? 2.5 : 1;
      poemStars[i].isHovered = i === idx;
    }
    selectedStarIdx = idx;
  }
});

document.addEventListener('mouseup', () => { isDragging = false; });

canvas.addEventListener('wheel', (e) => {
  if (!entered) return;
  targetCamDist = Math.max(200, Math.min(800, targetCamDist + e.deltaY * 0.3));
});

canvas.addEventListener('click', (e) => {
  if (!entered || isTransitioning) return;
  const idx = hitTest(e.clientX, e.clientY);
  if (idx >= 0) {
    autoRotate = false;
    openPoem(poemStars[idx].poem);
  }
});

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
  targetRotX = 0; targetRotY = 0;
  rotX = 0; rotY = 0;
  targetCamDist = 500;
  camDist = 500;
  isTransitioning = false;
});

// ===== TOAST =====
function showToast(msg) { toast.textContent = msg; toast.classList.remove('hidden'); toast.classList.add('show'); }
function hideToast() { toast.classList.remove('show'); toast.classList.add('hidden'); }

// ===== STAR COUNT =====
const starCountEl = document.getElementById('starCount');

// ===== ANIMATION LOOP =====
function animate(time) {
  requestAnimationFrame(animate);

  // Auto rotate
  if (autoRotate && !isDragging) {
    targetRotY += 0.002;
  }

  // Smooth rotation
  rotX += (targetRotX - rotX) * 0.06;
  rotY += (targetRotY - rotY) * 0.06;
  camDist += (targetCamDist - camDist) * 0.06;

  // Mouse parallax (subtle)
  if (!isDragging && !autoRotate) {
    // Already handled by drag
  }

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Draw particles
  drawParticles();

  // Update and draw poem stars
  updatePoemStars();
  drawPoemStars(time);

  // Star count
  const discovered = parseInt(starCountEl.dataset.discovered || '0');
  starCountEl.textContent = '✨ ' + discovered + ' / 30';
}

// ===== INIT =====
initParticles();
initPoemStars();
animate(0);
