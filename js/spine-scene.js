/**
 * SpineScene — AT Work helix, wrapped memory panels, dive in/out, particles & drips.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, ChromaticAberrationEffect } from 'postprocessing';
import { Timer } from './utils.js';
import spineVertexShader from './shaders/spine-vert.glsl';
import spineFragmentShader from './shaders/spine-frag.glsl';
import { WorkHelixRig } from './work-helix-rig.js';
import { ImmersiveDive } from './immersive-dive.js';
import { MegaParticleField } from './mega-particle-field.js';
import { InstancedDribbleTubes } from './instanced-dribble-tubes.js';

export class SpineScene {
  constructor(canvas, galleryItems) {
    this.canvas = canvas;
    this.galleryItems = galleryItems || [];
    this.fallback = false;
    this.scrollProgress = 0;
    this.mouse = new THREE.Vector2(0, 0);
    this.smoothMouse = new THREE.Vector2(0, 0);
    this.clock = new Timer();

    // Sub-objects
    this.floatingHearts = [];
    this.drips = [];
    this.cardMeshes = [];
    this.quality = 'high';

    // Zoom/raycasting states
    this.isZoomed = false;
    this.zoomedCard = null;
    this.raycaster = new THREE.Raycaster();

    this.workHelix = null;
    this.immersiveDive = null;
    this.megaField = null;
    this.dribbleTubes = null;
    this.loveWall = null;
    this.loveWallUniforms = null;
    this.wallDripPoints = null;
    this.wallDripVel = null;
    this.memorySurfaces = [];
    this.cardsGroup = null;
    this._savedFov = 52;

    this.isDragging = false;
    this.previousMouseX = 0;
    this.dragSpeed = 0.005;
    this._spawnDripsHandler = null;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.warn('WebGL SpineScene init failed:', e);
      this.fallback = true;
    }
  }

  setQuality(tier) {
    this.quality = tier;
    if (this.renderer) {
      this.renderer.setPixelRatio(tier === 'low' ? 1.0 : Math.min(window.devicePixelRatio, 2));
    }
  }

  async init() {
    if (this.fallback) {
      this.showCSSFallback();
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030308, 0.012);

    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(0, 8, 42);
    this._savedFov = 52;

    this.createDeepSpace();
    this.createLoveWall();
    this.createSpineParticles();
    this.createGoldHeartCoin();

    this.workHelix = new WorkHelixRig(this.galleryItems, this.quality);
    await this.workHelix.build(this.scene);
    this.cardMeshes = this.workHelix.cardMeshes;
    this.memorySurfaces = this.workHelix.memorySurfaces;
    this.cardsGroup = this.workHelix.cardsGroup;

    this.immersiveDive = new ImmersiveDive(this.scene, this.camera);

    if (this.quality !== 'low') {
      this.megaField = new MegaParticleField(this.quality);
      this.megaField.build(this.scene);
      this.dribbleTubes = new InstancedDribbleTubes(this.scene, this.quality === 'high' ? 900 : 450);
    }

    this.createFloatingHearts();
    this.createLights();
    this.initPostProcessing();
    this.bindDragEvents();

    this._spawnDripsHandler = () => {
      if (this.dribbleTubes && this.scrollProgress >= 0.2) {
        this.dribbleTubes.setMouseNDC(this.ndcMouseX || 0, this.ndcMouseY || 0);
      }
    };
    window.addEventListener('spawn-drips', this._spawnDripsHandler);

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  createDeepSpace() {
    const starCount = this.quality === 'high' ? 2400 : 800;
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xf5f2eb,
        size: 0.35,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    this.scene.add(stars);
    this.starfield = stars;
  }

  createLoveWall() {
    const wallGeo = new THREE.PlaneGeometry(42, 30, 1, 1);
    this.loveWallUniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 }
    };

    const wallMat = new THREE.ShaderMaterial({
      uniforms: this.loveWallUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uScroll;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float heartSDF(vec2 p, float s) {
          p /= s;
          p.y += 0.25;
          float a = atan(p.x, p.y) / 3.1415926;
          float r = length(p);
          float h = abs(a);
          float d = r - (0.7 - 0.35 * h);
          return d;
        }

        void main() {
          vec2 uv = vUv;
          vec2 c = uv - 0.5;

          // Base romantic gradient wall
          vec3 col = mix(vec3(0.02, 0.03, 0.08), vec3(0.12, 0.03, 0.07), uv.y);
          col += vec3(0.02, 0.07, 0.08) * (0.5 + 0.5 * sin(uv.y * 8.0 + uTime * 0.3));

          // Tiled glowing micro hearts
          vec2 tile = uv * vec2(9.0, 6.5);
          vec2 id = floor(tile);
          vec2 gv = fract(tile) - 0.5;
          float n = hash(id);
          float blink = 0.35 + 0.65 * sin(uTime * (0.9 + n) + n * 6.2831);
          float hs = heartSDF(gv, 0.43 + n * 0.08);
          float heart = smoothstep(0.07, -0.02, hs) * blink;
          vec3 heartCol = mix(vec3(0.25, 0.95, 0.85), vec3(1.0, 0.38, 0.58), n);
          col += heartCol * heart * 0.22;

          // Vertical dribble streaks
          float streakSeed = hash(vec2(floor(uv.x * 28.0), 1.0));
          float lane = smoothstep(0.49, 0.0, abs(fract(uv.x * 28.0) - 0.5));
          float yFlow = fract(uv.y * 1.8 - uTime * (0.22 + streakSeed * 0.65));
          float streak = lane * smoothstep(0.18, 0.0, yFlow) * (0.35 + streakSeed * 0.65);
          col += vec3(1.0, 0.32, 0.48) * streak * 0.18;

          // Vignette and section weighting
          float vig = smoothstep(1.08, 0.2, length(c * vec2(1.3, 1.0)));
          float wallVis = smoothstep(0.18, 0.34, uScroll) * (1.0 - smoothstep(0.9, 1.0, uScroll));
          col *= vig * (0.65 + 0.35 * wallVis);

          gl_FragColor = vec4(col, 0.6 * wallVis);
        }
      `
    });

    this.loveWall = new THREE.Mesh(wallGeo, wallMat);
    this.loveWall.position.set(0, -2.4, -18);
    this.scene.add(this.loveWall);

    // Particle drips crawling down the wall.
    const dripCount = this.quality === 'high' ? 720 : 320;
    const dripPos = new Float32Array(dripCount * 3);
    this.wallDripVel = new Float32Array(dripCount);
    for (let i = 0; i < dripCount; i++) {
      dripPos[i * 3] = (Math.random() - 0.5) * 38;
      dripPos[i * 3 + 1] = 8 + Math.random() * 12;
      dripPos[i * 3 + 2] = -17.4 + Math.random() * 0.8;
      this.wallDripVel[i] = 0.018 + Math.random() * 0.055;
    }
    const dripGeo = new THREE.BufferGeometry();
    dripGeo.setAttribute('position', new THREE.BufferAttribute(dripPos, 3));
    const dripMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0xff5c84,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.wallDripPoints = new THREE.Points(dripGeo, dripMat);
    this.scene.add(this.wallDripPoints);
  }

  onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer?.setSize(window.innerWidth, window.innerHeight);
  }

  showCSSFallback() {
    const galleryContainer = document.querySelector('.gallery-container');
    if (galleryContainer) {
      galleryContainer.classList.remove('hidden');
    }
  }

  createSpineParticles() {
    // Heavy particle count for premium look: 5500 on desktop
    const count = this.quality === 'high' ? 5500 : this.quality === 'medium' ? 2500 : 1000;
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const phases = new Float32Array(count);
    const strands = new Float32Array(count); // 0 = Strand A, 1 = Strand B, 2 = Rung, 3 = Stardust Core
    const seeds = new Float32Array(count);

    const teal = new THREE.Color(0x3ec1b0);
    const pink = new THREE.Color(0xff8ca3);
    const gold = new THREE.Color(0xffd25a);
    const white = new THREE.Color(0xf5f2eb);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      seeds[i] = Math.random();
      phases[i] = Math.random();

      // Distribute particles: 30% Strand A, 30% Strand B, 10% Rungs, 30% Stardust Core
      const rVal = Math.random();
      if (rVal < 0.3) {
        strands[i] = 0.0; // Strand A
      } else if (rVal < 0.6) {
        strands[i] = 1.0; // Strand B
      } else if (rVal < 0.7) {
        strands[i] = 2.0; // Rungs
      } else {
        strands[i] = 3.0; // Stardust Core
      }

      positions[idx] = 0;
      positions[idx + 1] = 0;
      positions[idx + 2] = 0;

      // Target position: centered heart so it's fully visible in-frame.
      const t = Math.PI * (2 * (i / count) - 1);
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const hz = (Math.random() - 0.5) * 5;

      targets[idx] = hx * 0.85 + (Math.random() - 0.5) * 0.6;
      targets[idx + 1] = hy * 0.82 - 4.0 + (Math.random() - 0.5) * 0.6;
      targets[idx + 2] = hz * 0.55;

      let col;
      if (strands[i] === 0.0) {
        col = teal.clone().lerp(white, Math.random() * 0.35);
      } else if (strands[i] === 1.0) {
        col = pink.clone().lerp(white, Math.random() * 0.35);
      } else if (strands[i] === 2.0) {
        col = gold.clone().lerp(white, Math.random() * 0.2);
      } else {
        // Stardust Core has glowing neon pink/teal shades
        col = Math.random() > 0.5
          ? pink.clone().lerp(white, Math.random() * 0.2)
          : teal.clone().lerp(white, Math.random() * 0.2);
      }

      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aTargetPosition', new THREE.BufferAttribute(targets, 3));
    geo.setAttribute('aCustomColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aHelixPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aHelixStrand', new THREE.BufferAttribute(strands, 1));
    geo.setAttribute('aRandomSeed', new THREE.BufferAttribute(seeds, 1));

    this.particleUniforms = {
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
      uMousePos: { value: new THREE.Vector2(0, 0) },
      uMouseRadius: { value: 4.5 },
      uHelixRadius: { value: 6.2 },
      uHelixHeight: { value: 40.0 }, // slightly taller to span compactly
      uTurns: { value: 4.5 }
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: spineVertexShader,
      fragmentShader: spineFragmentShader,
      uniforms: this.particleUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  createGoldHeartCoin() {
    this.coinGroup = new THREE.Group();

    // Thin gold cylinder geometry (Coin)
    const coinGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.22, 64);
    coinGeo.rotateX(Math.PI / 2); // rotate face forward

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd25a, // Metallic Gold
      metalness: 0.95,
      roughness: 0.16,
      bumpScale: 0.05,
      emissive: 0x442200,
      emissiveIntensity: 0.4
    });

    const coinBase = new THREE.Mesh(coinGeo, goldMat);
    this.coinGroup.add(coinBase);

    // Parametric Heart Emboss in ruby glass material
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.6);
    heartShape.bezierCurveTo(0, 0.62, -0.65, 1.25, -1.25, 1.25);
    heartShape.bezierCurveTo(-2.0, 1.25, -2.0, 0.4, -2.0, 0.4);
    heartShape.bezierCurveTo(-2.0, -0.5, -1.0, -1.6, 0, -2.5);
    heartShape.bezierCurveTo(1.0, -1.6, 2.0, -0.5, 2.0, 0.4);
    heartShape.bezierCurveTo(2.0, 0.4, 2.0, 1.25, 1.25, 1.25);
    heartShape.bezierCurveTo(0.65, 1.25, 0, 0.62, 0, 0.6);

    const logoGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.05,
      bevelThickness: 0.05
    });
    logoGeo.center();
    logoGeo.rotateX(Math.PI);

    // Ruby Red Glass Heart Material
    this.rubyMat = new THREE.MeshPhysicalMaterial({
      color: 0xff3860,
      transparent: true,
      opacity: 0.85,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transmission: 0.92,
      ior: 1.52,
      thickness: 0.6,
      emissive: 0x330005,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide
    });

    // Embed heart on front face
    const heartFront = new THREE.Mesh(logoGeo, this.rubyMat);
    heartFront.scale.setScalar(0.48);
    heartFront.position.set(0, 0, 0.08);
    this.coinGroup.add(heartFront);

    // Embed heart on back face
    const heartBack = new THREE.Mesh(logoGeo, this.rubyMat);
    heartBack.scale.setScalar(0.48);
    heartBack.position.set(0, 0, -0.08);
    heartBack.rotation.y = Math.PI;
    this.coinGroup.add(heartBack);

    // Scale and starting position
    this.coinGroup.scale.setScalar(0.85);
    this.coinGroup.position.set(0, 15, -2);
    this.scene.add(this.coinGroup);
  }

  createFloatingHearts() {
    if (this.quality === 'low') return;

    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 1.2);
    heartShape.bezierCurveTo(0, 1.2, -1.2, 0, 0, -1.2);
    heartShape.bezierCurveTo(0, -1.2, 1.2, 0, 0, 1.2);
    const geo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.2, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.05, bevelThickness: 0.05 });
    geo.center();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xff4a76,
      transparent: true,
      opacity: 0.15,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.8,
      transmission: 0.75,
      ior: 1.45,
      side: THREE.DoubleSide
    });

    const heartCount = this.quality === 'high' ? 8 : 4;
    for (let i = 0; i < heartCount; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      const yPos = (Math.random() - 0.5) * 35;
      const angle = Math.random() * Math.PI * 2;
      const radius = 5.5 + Math.random() * 3.5;

      mesh.position.set(
        radius * Math.cos(angle),
        yPos,
        radius * Math.sin(angle)
      );

      mesh.scale.setScalar(Math.random() * 0.4 + 0.15);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

      this.scene.add(mesh);
      this.floatingHearts.push(mesh);
    }
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    this.tealLight = new THREE.PointLight(0x3ec1b0, 3.5, 70);
    this.tealLight.position.set(12, 10, 8);
    this.scene.add(this.tealLight);

    this.pinkLight = new THREE.PointLight(0xff4a76, 4.0, 70);
    this.pinkLight.position.set(-12, -10, 8);
    this.scene.add(this.pinkLight);

    this.goldLight = new THREE.PointLight(0xffd25a, 0.5, 50);
    this.goldLight.position.set(0, 0, 10);
    this.scene.add(this.goldLight);
  }

  initPostProcessing() {
    if (this.quality === 'low') return;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloom = new BloomEffect({
      intensity: 3.35,
      luminanceThreshold: 0.04,
      luminanceSmoothing: 0.48,
      height: 512
    });

    const chroma = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0015, 0.0015),
      radialModulation: true
    });

    const vignette = new VignetteEffect({
      eskil: false,
      offset: 0.35,
      darkness: 0.75
    });

    this.composer.addPass(new EffectPass(this.camera, bloom, chroma, vignette));
  }

  updateScroll(progress) {
    this.scrollProgress = progress;
  }

  onMouseMove(x, y) {
    this.mouse.set(x, y);
    this.ndcMouseX = x;
    this.ndcMouseY = y;
  }

  bindDragEvents() {
    window.addEventListener('mousedown', (e) => {
      if (this.isZoomed || this.scrollProgress < 0.28 || this.scrollProgress > 0.88) return;
      this.isDragging = true;
      this.previousMouseX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || this.isZoomed) return;
      const deltaX = e.clientX - this.previousMouseX;
      if (this.workHelix) this.workHelix.dragOffset += deltaX * this.dragSpeed;
      this.previousMouseX = e.clientX;
    });

    window.addEventListener('touchstart', (e) => {
      if (this.isZoomed || !e.touches.length || this.scrollProgress < 0.28 || this.scrollProgress > 0.88) return;
      this.isDragging = true;
      this.previousMouseX = e.touches[0].clientX;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || this.isZoomed || !e.touches.length) return;
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      if (this.workHelix) this.workHelix.dragOffset += deltaX * this.dragSpeed;
      this.previousMouseX = e.touches[0].clientX;
    }, { passive: true });
  }

  handleCanvasClick() {
    if (this.isZoomed || this.fallback) return;
    if (this.scrollProgress < 0.28 || this.scrollProgress > 0.88) return;

    const mouseVector = new THREE.Vector2(this.ndcMouseX, this.ndcMouseY);
    this.raycaster.setFromCamera(mouseVector, this.camera);

    const intersects = this.raycaster.intersectObjects(this.cardMeshes);
    if (intersects.length > 0) {
      this.diveInsideCard(intersects[0].object);
    }
  }

  diveInsideCard(card) {
    if (!this.workHelix) return;

    this.isZoomed = true;
    this.zoomedCard = card;
    this._savedFov = this.camera.fov;
    this._savedCamPos = this.camera.position.clone();

    const portal = document.getElementById('portal-wipe');
    if (portal) {
      portal.classList.add('active');
      gsap.fromTo(portal, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power3.in' });
      gsap.to(portal, {
        opacity: 0,
        duration: 0.9,
        delay: 0.35,
        ease: 'power2.out',
        onComplete: () => portal.classList.remove('active')
      });
    }

    const tex = card.material.uniforms.uTexture?.value;
    const pack = this.memorySurfaces[card.userData.index];
    let previewUrl = card.userData.image || '';
    if (tex?.image instanceof HTMLCanvasElement) {
      previewUrl = tex.image.toDataURL('image/jpeg', 0.92);
    } else if (tex?.image?.src) previewUrl = tex.image.src;

    window.dispatchEvent(new CustomEvent('gallery-dive-in', {
      detail: {
        index: card.userData.index,
        caption: card.userData.caption,
        emoji: card.userData.emoji,
        date: card.userData.date,
        story: card.userData.story,
        previewUrl: pack?.isVideo ? '' : previewUrl,
        videoSrc: card.userData.video || (pack?.isVideo ? this.galleryItems[card.userData.index]?.video : '')
      }
    }));

    window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'section-chime' } }));
    document.body.classList.remove('cursor-hover');

    const alignRot = this.workHelix.alignPanelToCamera(card);
    const dive = this.workHelix.getDiveCameraTarget(card);
    const look = { x: dive.lookAt.x, y: dive.lookAt.y, z: dive.lookAt.z };

    const tl = gsap.timeline({
      onComplete: () => {
        if (this.immersiveDive && tex) {
          this.immersiveDive.show(tex, !!pack?.isVideo);
        }
      }
    });
    this.zoomTimeline = tl;

    tl.to(this.workHelix.cardsGroup.rotation, {
      y: alignRot,
      duration: 1.4,
      ease: 'power4.inOut'
    }, 0);

    tl.to(this.camera.position, {
      x: dive.position.x,
      y: dive.position.y,
      z: dive.position.z,
      duration: 1.7,
      ease: 'power4.inOut'
    }, 0);

    tl.to(this.camera, {
      fov: 36,
      duration: 1.7,
      ease: 'power3.inOut',
      onUpdate: () => this.camera.updateProjectionMatrix()
    }, 0);

    tl.to(look, {
      x: dive.lookAt.x,
      y: dive.lookAt.y,
      z: dive.lookAt.z,
      duration: 1.7,
      ease: 'power4.inOut',
      onUpdate: () => this.camera.lookAt(look.x, look.y, look.z)
    }, 0);

    tl.to(card.material.uniforms.uBendAmount, { value: 0.02, duration: 0.95 }, 0.15);
    tl.to(card.material.uniforms.uHover, { value: 1.25, duration: 0.65 }, 0.2);
    tl.to(card.scale, { x: 1.1, y: 1.1, z: 1.1, duration: 1.25, ease: 'power3.out' }, 0.25);

    this.cardMeshes.forEach((c) => {
      if (c !== card) {
        tl.to(c.material.uniforms.uOpacity, { value: 0.05, duration: 0.75 }, 0);
      }
    });

    if (this.workHelix.shellUniforms?.uVisibility) {
      tl.to(this.workHelix.shellUniforms.uVisibility, { value: 0.12, duration: 0.85 }, 0);
    }
    if (this.particles?.material?.uniforms?.uScrollProgress) {
      tl.to(this.particles.material.uniforms.uScrollProgress, { value: 0.05, duration: 0.85 }, 0);
    }
  }

  async comeOutside() {
    if (!this.isZoomed || !this.zoomedCard || !this.workHelix) return;

    const card = this.zoomedCard;
    const portal = document.getElementById('portal-wipe');
    if (portal) {
      portal.classList.add('active');
      gsap.fromTo(portal, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.in' });
    }

    if (this.immersiveDive) await this.immersiveDive.hide();

    const pose = this.workHelix.getCameraPose(this.scrollProgress, this.smoothMouse, false);
    const look = { x: pose.lookAt.x, y: pose.lookAt.y, z: pose.lookAt.z };

    const tl = gsap.timeline({
      onComplete: () => {
        this.isZoomed = false;
        this.zoomedCard = null;
        if (portal) {
          gsap.to(portal, { opacity: 0, duration: 0.55, onComplete: () => portal.classList.remove('active') });
        }
      }
    });

    tl.to(card.material.uniforms.uBendAmount, { value: 0.35, duration: 0.9 }, 0);
    tl.to(card.material.uniforms.uHover, { value: 0, duration: 0.5 }, 0);
    tl.to(card.scale, { x: 1, y: 1, z: 1, duration: 0.9 }, 0);

    this.cardMeshes.forEach((c) => {
      tl.to(c.material.uniforms.uOpacity, { value: 1, duration: 0.8 }, 0);
    });

    if (this.workHelix.shellUniforms?.uVisibility) {
      tl.to(this.workHelix.shellUniforms.uVisibility, { value: 1, duration: 0.85 }, 0);
    }
    if (this.particles?.material?.uniforms?.uScrollProgress) {
      tl.to(this.particles.material.uniforms.uScrollProgress, { value: this.scrollProgress, duration: 0.85 }, 0);
    }

    tl.to(this.camera.position, {
      x: pose.position.x,
      y: pose.position.y,
      z: pose.position.z,
      duration: 1.55,
      ease: 'power3.inOut'
    }, 0);

    tl.to(this.camera, {
      fov: this._savedFov || 52,
      duration: 1.55,
      ease: 'power3.inOut',
      onUpdate: () => this.camera.updateProjectionMatrix()
    }, 0);

    tl.to(look, {
      x: pose.lookAt.x,
      y: pose.lookAt.y,
      z: pose.lookAt.z,
      duration: 1.55,
      ease: 'power3.inOut',
      onUpdate: () => this.camera.lookAt(look.x, look.y, look.z)
    }, 0);

    window.dispatchEvent(new CustomEvent('gallery-dive-out'));
  }

  animate() {
    if (this.fallback) return;
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Update particle uniforms
    if (this.particleUniforms) {
      this.particleUniforms.uTime.value = time;
      this.particleUniforms.uScrollProgress.value = this.scrollProgress;
      this.particleUniforms.uMousePos.value.copy(this.smoothMouse);
    }

    // Helix particles rotation
    if (this.particles) {
      this.particles.rotation.y = time * 0.025 + this.scrollProgress * 0.65;
      this.particles.rotation.x = Math.sin(time * 0.005) * 0.05;
    }

    if (this.workHelix) {
      this.workHelix.update(time, this.scrollProgress, this.isZoomed);
    }

    if (this.megaField) {
      this.megaField.update(time, this.scrollProgress, this.smoothMouse);
    }

    if (this.loveWallUniforms) {
      this.loveWallUniforms.uTime.value = time;
      this.loveWallUniforms.uScroll.value = this.scrollProgress;
    }

    if (this.wallDripPoints) {
      const arr = this.wallDripPoints.geometry.attributes.position.array;
      const vis = this.scrollProgress >= 0.2 && this.scrollProgress <= 0.95;
      this.wallDripPoints.material.opacity += ((vis ? 0.42 : 0.0) - this.wallDripPoints.material.opacity) * 0.08;
      for (let i = 0; i < this.wallDripVel.length; i++) {
        arr[i * 3 + 1] -= this.wallDripVel[i];
        if (arr[i * 3 + 1] < -16) {
          arr[i * 3] = (Math.random() - 0.5) * 38;
          arr[i * 3 + 1] = 9 + Math.random() * 12;
          arr[i * 3 + 2] = -17.5 + Math.random() * 0.8;
          this.wallDripVel[i] = 0.018 + Math.random() * 0.055;
        }
      }
      this.wallDripPoints.geometry.attributes.position.needsUpdate = true;
    }

    if (this.dribbleTubes && this.scrollProgress >= 0.15) {
      this.dribbleTubes.setMouseNDC(this.ndcMouseX || 0, this.ndcMouseY || 0);
      this.dribbleTubes.update(this.camera);
    }

    if (this.immersiveDive) {
      this.immersiveDive.followCamera();
    }

    if (!this.isZoomed && this.scrollProgress >= 0.28 && this.scrollProgress <= 0.88) {
      const mouseVector = new THREE.Vector2(this.ndcMouseX, this.ndcMouseY);
      this.raycaster.setFromCamera(mouseVector, this.camera);
      const intersects = this.raycaster.intersectObjects(this.cardMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        if (this.hoveredMesh !== hitMesh) {
          if (this.hoveredMesh) {
            gsap.to(this.hoveredMesh.material.uniforms.uHover, { value: 0.0, duration: 0.3 });
          }
          this.hoveredMesh = hitMesh;
          gsap.to(hitMesh.material.uniforms.uHover, { value: 1.0, duration: 0.3 });
          document.body.classList.add('cursor-hover');
        }
      } else if (this.hoveredMesh) {
        gsap.to(this.hoveredMesh.material.uniforms.uHover, { value: 0.0, duration: 0.3 });
        this.hoveredMesh = null;
        document.body.classList.remove('cursor-hover');
      }
    }

    if (this.coinGroup && this.workHelix) {
      const coinT = THREE.MathUtils.clamp(0.04 + this.scrollProgress * 0.9, 0.02, 0.98);
      const tr = this.workHelix.getSurfaceTransform(coinT);
      this.coinGroup.position.copy(tr.position);
      this.coinGroup.position.add(tr.normal.clone().multiplyScalar(1.35));
      this.coinGroup.position.y += Math.sin(time * 1.6) * 0.14;
      this.coinGroup.position.x += Math.sin(time * 0.9) * 0.12;

      const rotationSpeed = 0.55 + this.scrollProgress * 0.85;
      this.coinGroup.rotation.y = time * rotationSpeed;
      this.coinGroup.rotation.x = Math.sin(time * 0.5) * 0.18;
      this.coinGroup.rotation.z = Math.cos(time * 0.3) * 0.12;

      if (this.scrollProgress > 0.88) {
        const pulse = 1.0 + Math.sin(time * 3.5) * 0.1;
        const scaleVal = 0.85 * pulse;
        this.coinGroup.scale.set(scaleVal, scaleVal, scaleVal);
        this.rubyMat.emissiveIntensity = 0.5 + Math.sin(time * 3.5) * 0.4;
      } else {
        this.coinGroup.scale.set(0.85, 0.85, 0.85);
        this.rubyMat.emissiveIntensity = 0.5;
      }
    }

    if (this.starfield) {
      this.starfield.rotation.y = time * 0.008;
    }

    this.floatingHearts.forEach((heart, idx) => {
      heart.rotation.y += delta * 0.25;
      heart.rotation.x += delta * 0.12;
      heart.position.y += Math.sin(time * 0.8 + idx * 1.5) * 0.006;
      heart.material.opacity = 0.12 + this.scrollProgress * 0.25;
    });

    this.smoothMouse.lerp(this.mouse, 0.05);

    if (!this.isZoomed && this.workHelix) {
      const pose = this.workHelix.getCameraPose(this.scrollProgress, this.smoothMouse, false);
      this.camera.position.lerp(pose.position, 0.1);
      if (!this._camLook) this._camLook = pose.lookAt.clone();
      this._camLook.lerp(pose.lookAt, 0.12);
      if (this.scrollProgress > 0.86) {
        const heartLook = new THREE.Vector3(0, -4, 0);
        const heartCam = new THREE.Vector3(0, -2.2, 24);
        this.camera.position.lerp(heartCam, 0.055);
        this._camLook.lerp(heartLook, 0.08);
      }
      this.camera.lookAt(this._camLook);

      const galleryBlend = this.workHelix._smooth(this.scrollProgress, 0.22, 0.88);
      this.camera.fov = THREE.MathUtils.lerp(58, 46, galleryBlend);
      this.camera.updateProjectionMatrix();
    }

    // Lights colors shifts
    if (this.tealLight) {
      this.tealLight.intensity = 3.5 * (1.0 - this.scrollProgress * 0.6);
      this.pinkLight.intensity = 4.0 * (0.6 + this.scrollProgress * 0.8);
      this.goldLight.intensity = 0.5 + this.scrollProgress * 5.0 + (this.scrollProgress > 0.8 ? Math.sin(time * 3.5) * 1.5 : 0.0);
    }

    // Composer render
    if (this.composer && this.quality !== 'low') {
      this.composer.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this._spawnDripsHandler) {
      window.removeEventListener('spawn-drips', this._spawnDripsHandler);
    }
    this.renderer?.dispose();
    this.composer?.dispose();
    this.rubyMat?.dispose();
    this.cardMeshes.forEach((mesh) => {
      mesh.material?.dispose();
      mesh.material?.uniforms?.uTexture?.value?.dispose();
    });
  }
}
