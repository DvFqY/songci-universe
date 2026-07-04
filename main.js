// ===== CURSOR GLOW =====
const cursorGlow = document.querySelector('.cursor-glow');
document.addEventListener('mousemove', (e) => {
  cursorGlow.style.left = e.clientX + 'px';
  cursorGlow.style.top = e.clientY + 'px';
});

// ===== NAVBAR =====
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 100);
});

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// ===== SCROLL REVEAL =====
const revealElements = document.querySelectorAll('[data-reveal]');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay) || 0;
      setTimeout(() => {
        entry.target.classList.add('revealed');
      }, delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

// ===== ACTIVE NAV LINK ON SCROLL =====
const sections = document.querySelectorAll('.section, .hero');
const navAnchors = document.querySelectorAll('.nav-links a');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navAnchors.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    }
  });
}, { threshold: 0.3 });

sections.forEach(s => sectionObserver.observe(s));

// ===== THREE.JS PARTICLE SYSTEM =====
let scene, camera, renderer, particles, particleSystem;
let mouseX = 0, mouseY = 0;
let targetRotX = 0, targetRotY = 0;

function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 30;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 0.1 + Math.random() * 0.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 64;
  textureCanvas.height = 64;
  const ctx = textureCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(textureCanvas);

  const material = new THREE.PointsMaterial({
    size: 0.25,
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    vertexColors: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Second layer - smaller, faster particles
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
    size: 0.08,
    color: 0x6366f1,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  particleSystem = new THREE.Points(geo2, mat2);
  scene.add(particleSystem);
}

function animateParticles() {
  requestAnimationFrame(animateParticles);

  if (particles) {
    particles.rotation.x += (targetRotX - particles.rotation.x) * 0.02;
    particles.rotation.y += (targetRotY - particles.rotation.y) * 0.02;
  }
  if (particleSystem) {
    particleSystem.rotation.y += 0.0003;
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

document.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  targetRotX = mouseY * 0.15;
  targetRotY = mouseX * 0.15;
});

window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});

// ===== GSAP SCROLL ANIMATIONS =====
gsap.registerPlugin(ScrollTrigger);

// Hero parallax
gsap.to('.hero-content', {
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1
  },
  y: 150,
  opacity: 0.3,
  scale: 0.95
});

gsap.to('.hero-bg-layer', {
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1
  },
  scale: 1.3,
  opacity: 0.5
});

// Section backgrounds parallax
document.querySelectorAll('.section').forEach(section => {
  const bg = section.querySelector('.section-bg');
  if (bg) {
    gsap.fromTo(bg,
      { y: 0 },
      {
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        y: -100
      }
    );
  }
});

// Feature items stagger
document.querySelectorAll('.feature-item').forEach((item, i) => {
  gsap.from(item, {
    scrollTrigger: {
      trigger: item,
      start: 'top 85%',
      toggleActions: 'play none none reverse'
    },
    x: -60,
    opacity: 0,
    duration: 0.8,
    delay: i * 0.1,
    ease: 'power3.out'
  });
});

// About cards stagger
document.querySelectorAll('.about-card').forEach((card, i) => {
  gsap.from(card, {
    scrollTrigger: {
      trigger: card,
      start: 'top 85%',
      toggleActions: 'play none none reverse'
    },
    y: 60,
    opacity: 0,
    duration: 0.8,
    delay: i * 0.15,
    ease: 'back.out(1.7)'
  });
});

// Showcase items stagger
document.querySelectorAll('.showcase-item').forEach((item, i) => {
  gsap.from(item, {
    scrollTrigger: {
      trigger: item,
      start: 'top 85%',
      toggleActions: 'play none none reverse'
    },
    y: 80,
    opacity: 0,
    scale: 0.9,
    duration: 0.8,
    delay: i * 0.12,
    ease: 'power4.out'
  });
});

// ===== PARALLAX ON MOUSE MOVE FOR SHOWCASE =====
document.querySelectorAll('.showcase-item').forEach(item => {
  item.addEventListener('mousemove', (e) => {
    const rect = item.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const img = item.querySelector('.showcase-placeholder');
    if (img) {
      img.style.transform = `scale(1.1) translate(${x * 10}px, ${y * 10}px)`;
    }
  });
  item.addEventListener('mouseleave', () => {
    const img = item.querySelector('.showcase-placeholder');
    if (img) {
      img.style.transform = 'scale(1) translate(0, 0)';
    }
  });
});

// ===== INIT =====
initParticles();
animateParticles();
