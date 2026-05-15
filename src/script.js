import * as THREE from 'three';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { vertexShader, fragmentShader } from './shaders.js';
import './styles.css';

gsap.registerPlugin(ScrollTrigger);

/* ═══════════════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════════════ */

const CONFIG = {
  totalImages: 10,
  tilesPerRevolution: 15,
  revolutions: 5,
  startRadius: 5,
  endRadius: 3.5,
  tileHeightRatio: 1.1,
  tileSegments: 24,
  spiralGap: 0.35,
  tileOverlap: 0.005,
  cameraZ: 12,
  cameraSmoothing: 0.075,
  baseRotationSpeed: 0.001,
  scrollRotationMultiplier: 0.0035,
  rotationDecay: 0.9,
  scrollMultiplier: 1.25,
  cameraYMultiplier: 0.2,
  parallaxStrength: 0.1,
  spiralOffsetY: -2.0,
};

/* ═══════════════════════════════════════════════════
   DOM + STATE
   ═══════════════════════════════════════════════════ */

const hero = document.querySelector('.hero');
const cursorEl = document.getElementById('cursor');
const cursorDot = cursorEl?.querySelector('.cursor__dot');
const cursorRing = cursorEl?.querySelector('.cursor__ring');
const scrollProgressEl = document.getElementById('scrollProgress');
const preloaderEl = document.getElementById('preloader');
const preloaderFill = document.getElementById('preloaderFill');
const preloaderCounter = document.getElementById('preloaderCounter');

const state = {
  isMobile: window.innerWidth < 768,
  width: hero.clientWidth,
  height: hero.clientHeight,
  scrollProgress: 0,
  scrollVelocity: 0,
  spinVelocity: 0,
  targetCameraY: 0,
  currentCameraY: 0,
  mouseX: 0,
  mouseY: 0,
  targetTiltX: 0,
  targetTiltZ: 0,
  currentTiltX: 0,
  currentTiltZ: 0,
  cursorX: 0,
  cursorY: 0,
  cursorTargetX: 0,
  cursorTargetY: 0,
};

/* ═══════════════════════════════════════════════════
   CUSTOM CURSOR
   ═══════════════════════════════════════════════════ */

if (!state.isMobile && cursorEl) {
  document.addEventListener('mousemove', (e) => {
    state.cursorTargetX = e.clientX;
    state.cursorTargetY = e.clientY;
  });

  // Hover detection for interactive elements
  const hoverTargets = document.querySelectorAll('a, button, .practice__row, .field__row, .approach__step');
  hoverTargets.forEach((el) => {
    el.addEventListener('mouseenter', () => cursorEl.classList.add('cursor--hover'));
    el.addEventListener('mouseleave', () => cursorEl.classList.remove('cursor--hover'));
  });

  function animateCursor() {
    state.cursorX += (state.cursorTargetX - state.cursorX) * 0.15;
    state.cursorY += (state.cursorTargetY - state.cursorY) * 0.15;
    cursorDot.style.left = `${state.cursorTargetX}px`;
    cursorDot.style.top = `${state.cursorTargetY}px`;
    cursorRing.style.left = `${state.cursorX}px`;
    cursorRing.style.top = `${state.cursorY}px`;
    requestAnimationFrame(animateCursor);
  }
  requestAnimationFrame(animateCursor);
}

/* ═══════════════════════════════════════════════════
   THREE.JS SETUP
   ═══════════════════════════════════════════════════ */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, state.width / state.height, 0.1, 100);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.setSize(state.width, state.height);
renderer.domElement.classList.add('hero__canvas');
hero.appendChild(renderer.domElement);

camera.position.set(0, 0, CONFIG.cameraZ + (state.isMobile ? 3 : 0));

/* ═══════════════════════════════════════════════════
   CURVED TILE GEOMETRY
   ═══════════════════════════════════════════════════ */

function createCurvedTileGeometry(radius, arcAngle, tileHeight, segments) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = -arcAngle / 2 + t * arcAngle;
    const x = Math.sin(theta) * radius;
    const z = Math.cos(theta) * radius;

    positions.push(x, tileHeight / 2, z);
    uvs.push(t, 1);
    positions.push(x, -tileHeight / 2, z);
    uvs.push(t, 0);
  }

  for (let i = 0; i < segments; i++) {
    const tl = i * 2, bl = i * 2 + 1;
    const tr = (i + 1) * 2, br = (i + 1) * 2 + 1;
    indices.push(tl, bl, tr);
    indices.push(bl, br, tr);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/* ═══════════════════════════════════════════════════
   TEXTURE LOADING (with preloader progress)
   ═══════════════════════════════════════════════════ */

function loadTextures() {
  const loader = new THREE.TextureLoader();
  let loaded = 0;

  const promises = [];
  for (let i = 1; i <= CONFIG.totalImages; i++) {
    const promise = new Promise((resolve) => {
      loader.load(
        `/images/img${i}.jpg`,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          loaded++;
          updatePreloader(loaded, CONFIG.totalImages);
          resolve(texture);
        },
        undefined,
        () => {
          const data = new Uint8Array([22, 22, 24, 255]);
          const fallback = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
          fallback.needsUpdate = true;
          loaded++;
          updatePreloader(loaded, CONFIG.totalImages);
          resolve(fallback);
        }
      );
    });
    promises.push(promise);
  }
  return Promise.all(promises);
}

function updatePreloader(loaded, total) {
  const pct = Math.round((loaded / total) * 100);
  if (preloaderFill) preloaderFill.style.width = `${pct}%`;
  if (preloaderCounter) preloaderCounter.textContent = pct;
}

function hidePreloader() {
  if (preloaderEl) {
    preloaderEl.classList.add('preloader--hidden');
    setTimeout(() => { preloaderEl.remove(); }, 1000);
  }
}

/* ═══════════════════════════════════════════════════
   BUILD SPIRAL
   ═══════════════════════════════════════════════════ */

const spiral = new THREE.Group();

function buildSpiral(textures) {
  const totalTiles = CONFIG.tilesPerRevolution * CONFIG.revolutions;
  const angleStep = (Math.PI * 2) / CONFIG.tilesPerRevolution;
  const arcAngle = angleStep + CONFIG.tileOverlap;
  const chord = 2 * CONFIG.startRadius * Math.sin(angleStep / 2);
  const tileHeight = chord * CONFIG.tileHeightRatio;
  const startY = ((totalTiles - 1) * CONFIG.spiralGap) / 2;

  for (let i = 0; i < totalTiles; i++) {
    const progress = i / (totalTiles - 1);
    const radius = CONFIG.startRadius + (CONFIG.endRadius - CONFIG.startRadius) * progress;
    const geometry = createCurvedTileGeometry(radius, arcAngle, tileHeight, CONFIG.tileSegments);
    const texture = textures[i % textures.length];

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uMap: { value: texture },
        uCameraPosition: { value: camera.position },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });

    const tile = new THREE.Mesh(geometry, material);
    tile.position.y = startY - i * CONFIG.spiralGap;
    tile.rotation.y = i * angleStep;
    spiral.add(tile);
  }

  spiral.position.y = CONFIG.spiralOffsetY;
  scene.add(spiral);
}

/* ═══════════════════════════════════════════════════
   LENIS SMOOTH SCROLL
   ═══════════════════════════════════════════════════ */

const lenis = new Lenis({
  duration: 1.2,
  smoothWheel: true,
  smoothTouch: false,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
});

lenis.on('scroll', ({ scroll, limit, velocity }) => {
  state.scrollProgress = Math.min(scroll / Math.max(limit, 1), 1);
  state.scrollVelocity = velocity;
  state.spinVelocity += velocity * CONFIG.scrollRotationMultiplier * CONFIG.scrollMultiplier;

  // Update scroll progress bar
  if (scrollProgressEl) {
    scrollProgressEl.style.width = `${state.scrollProgress * 100}%`;
  }
});

lenis.on('scroll', ScrollTrigger.update);

function lenisRaf(time) {
  lenis.raf(time);
  requestAnimationFrame(lenisRaf);
}
requestAnimationFrame(lenisRaf);

/* ═══════════════════════════════════════════════════
   GSAP SCROLL REVEALS (enhanced)
   ═══════════════════════════════════════════════════ */

const ctx = gsap.context(() => {
  // Staggered reveal for text
  gsap.utils.toArray('.reveal-text').forEach((el, i) => {
    gsap.fromTo(
      el,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1.4,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true,
        },
      }
    );
  });

  // Parallax on section headings
  gsap.utils.toArray('.section__heading').forEach((el) => {
    gsap.to(el, {
      y: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5,
      },
    });
  });

  // Marquee speed boost on scroll
  const marqueeTrack = document.querySelector('.marquee__track');
  if (marqueeTrack) {
    gsap.to(marqueeTrack, {
      x: '-25%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.marquee',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2,
      },
    });
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => ctx.revert());
}

window.addEventListener('load', () => ScrollTrigger.refresh());

/* ═══════════════════════════════════════════════════
   MOUSE PARALLAX (desktop only)
   ═══════════════════════════════════════════════════ */

window.addEventListener('mousemove', (e) => {
  if (state.isMobile) return;
  state.mouseX = (e.clientX / innerWidth) * 2 - 1;
  state.mouseY = (e.clientY / innerHeight) * 2 - 1;
  state.targetTiltX = state.mouseY * CONFIG.parallaxStrength;
  state.targetTiltZ = state.mouseX * CONFIG.parallaxStrength * -0.5;
});

/* ═══════════════════════════════════════════════════
   RESIZE
   ═══════════════════════════════════════════════════ */

function onResize() {
  state.isMobile = window.innerWidth < 768;
  state.width = hero.clientWidth;
  state.height = hero.clientHeight;

  camera.aspect = state.width / state.height;
  camera.updateProjectionMatrix();
  camera.position.z = CONFIG.cameraZ + (state.isMobile ? 3 : 0);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(state.width, state.height);

  if (state.isMobile) {
    state.targetTiltX = 0;
    state.targetTiltZ = 0;
  }
}

window.addEventListener('resize', onResize);

/* ═══════════════════════════════════════════════════
   RENDER LOOP
   ═══════════════════════════════════════════════════ */

function tick() {
  requestAnimationFrame(tick);

  spiral.rotation.y += CONFIG.baseRotationSpeed + state.spinVelocity;
  state.spinVelocity *= CONFIG.rotationDecay;

  if (!state.isMobile) {
    state.currentTiltX += (state.targetTiltX - state.currentTiltX) * CONFIG.cameraSmoothing;
    state.currentTiltZ += (state.targetTiltZ - state.currentTiltZ) * CONFIG.cameraSmoothing;
    spiral.rotation.x = state.currentTiltX;
    spiral.rotation.z = state.currentTiltZ;
  }

  state.targetCameraY = -state.scrollProgress * CONFIG.cameraYMultiplier * 10;
  state.currentCameraY += (state.targetCameraY - state.currentCameraY) * CONFIG.cameraSmoothing;
  camera.position.y = state.currentCameraY;
  camera.lookAt(0, state.currentCameraY * 0.4, 0);

  renderer.render(scene, camera);
}

/* ═══════════════════════════════════════════════════
   INIT — deferred behind requestIdleCallback
   ═══════════════════════════════════════════════════ */

function initWebGL() {
  loadTextures().then((textures) => {
    buildSpiral(textures);
    renderer.domElement.classList.add('hero__canvas--visible');
    hidePreloader();
    tick();
  });
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(initWebGL, { timeout: 1500 });
} else {
  requestAnimationFrame(() => {
    requestAnimationFrame(initWebGL);
  });
}
