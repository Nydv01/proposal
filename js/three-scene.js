/**
 * ThreeScene — Cinematic particle universe with multi-stage morph shapes,
 * post-processing pipeline, glass hearts, and DOM-synced WebGL deforming gallery.
 */
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, ChromaticAberrationEffect } from 'postprocessing';
import gsap from 'gsap';
import { Timer } from './utils.js';

// Load GLSL shaders via vite-plugin-glsl
import particleVertexShader from './shaders/particle-vert.glsl';
import particleFragmentShader from './shaders/particle-frag.glsl';
import galleryVertexShader from './shaders/gallery-vert.glsl';
import galleryFragmentShader from './shaders/gallery-frag.glsl';
import { InstancedDribbleTubes } from './instanced-dribble-tubes.js';

export class ThreeScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.fallback = false;
    this.scrollProgress = 0;
    this.mouse = new THREE.Vector2(0, 0);
    this.smoothMouse = new THREE.Vector2(0, 0);
    this.clock = new Timer();
    this.hearts = [];
    this.galleryMeshes = [];
    this.quality = 'high';
    this.zoomedMesh = null; // Reference to currently zoomed gallery mesh
    this.dribbleTubes = null;
    this.galleryItems = [];

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
      console.warn('WebGL not available', e);
      this.fallback = true;
    }
  }

  isFallback() {
    return this.fallback;
  }

  setQuality(tier) {
    this.quality = tier;
    if (this.renderer) {
      this.renderer.setPixelRatio(tier === 'low' ? 1.0 : Math.min(window.devicePixelRatio, 2));
    }
  }

  init() {
    if (this.fallback) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 30;

    // Build components
    this.createParticleUniverse();
    this.createGlassHearts();
    this.createCentralGlassHeart();
    this.createLoveWall();
    this.createLights();
    this.initPostProcessing();

    // Initialize Dribble Tubes (cursor-reactive background drips)
    this.dribbleTubes = new InstancedDribbleTubes(this.scene, this.quality === 'high' ? 400 : 150);

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  setGalleryItems(items) {
    this.galleryItems = items || [];
  }

  createParticleUniverse() {
    const count = this.quality === 'high' ? 6000 : this.quality === 'medium' ? 2500 : 800;
    const positions = new Float32Array(count * 3);
    const targetsHeart = new Float32Array(count * 3);
    const targetsInitials = new Float32Array(count * 3);
    const targetsRing = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    const teal = new THREE.Color(0x3ec1b0);
    const pink = new THREE.Color(0xff8ca3);
    const white = new THREE.Color(0xf5f2eb);
    const gold = new THREE.Color(0xffd25a);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      seeds[i] = Math.random();

      // State 1: Cosmic stardust sphere (Base coordinate)
      const u = Math.random(), v = Math.random();
      const theta = u * 2 * Math.PI;
      const phi = Math.acos(2 * v - 1);
      const r = 28 * Math.cbrt(Math.random());
      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = r * Math.cos(phi);

      // State 2: 3D Heart shape target (perfectly centered)
      const t = Math.PI * (2 * (i / count) - 1);
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const hz = (Math.random() - 0.5) * 5;
      targetsHeart[idx] = hx * 0.7 + (Math.random() - 0.5) * 1.2;
      targetsHeart[idx + 1] = (hy + 6.0) * 0.7 - 10.5 + (Math.random() - 0.5) * 1.2; // Shift Y to match camera at scrollProgress=0.35
      targetsHeart[idx + 2] = hz;

      // State 3: Initials "N ♥ K" target
      // Split particle spaces: N (35%), Heart (30%), K (35%)
      const partition = i / count;
      if (partition < 0.35) {
        // Character N paths
        const sub = partition / 0.35;
        if (sub < 0.33) {
          // Left vertical line
          targetsInitials[idx] = -6.0;
          targetsInitials[idx + 1] = (sub * 3.0 - 0.5) * 8.0 - 21.0; // Shift Y to match camera at scrollProgress=0.7
        } else if (sub < 0.66) {
          // Diagonal line
          const progress = (sub - 0.33) * 3.0;
          targetsInitials[idx] = -6.0 + progress * 4.0;
          targetsInitials[idx + 1] = (0.5 - progress) * 8.0 - 21.0;
        } else {
          // Right vertical line
          const progress = (sub - 0.66) * 3.0;
          targetsInitials[idx] = -2.0;
          targetsInitials[idx + 1] = (progress - 0.5) * 8.0 - 21.0;
        }
        targetsInitials[idx + 2] = (Math.random() - 0.5) * 2.0;
      } else if (partition < 0.65) {
        // Heart symbol (centered at x=0, y=0)
        const sub = (partition - 0.35) / 0.3;
        const ht = Math.PI * (2 * sub - 1);
        const heartX = 16 * Math.pow(Math.sin(ht), 3);
        const heartY = 13 * Math.cos(ht) - 5 * Math.cos(2 * ht) - 2 * Math.cos(3 * ht) - Math.cos(4 * ht);
        targetsInitials[idx] = heartX * 0.22;
        targetsInitials[idx + 1] = (heartY + 6.0) * 0.22 - 21.0; // Center and shift Y
        targetsInitials[idx + 2] = (Math.random() - 0.5) * 2.0;
      } else {
        // Character K paths
        const sub = (partition - 0.65) / 0.35;
        if (sub < 0.4) {
          // Vertical spine line
          const progress = sub / 0.4;
          targetsInitials[idx] = 2.5;
          targetsInitials[idx + 1] = (progress - 0.5) * 8.0 - 21.0;
        } else if (sub < 0.7) {
          // Diagonal upper arm
          const progress = (sub - 0.4) / 0.3;
          targetsInitials[idx] = 2.5 + progress * 3.5;
          targetsInitials[idx + 1] = progress * 4.0 - 21.0;
        } else {
          // Diagonal lower arm
          const progress = (sub - 0.7) / 0.3;
          targetsInitials[idx] = 2.5 + progress * 3.5;
          targetsInitials[idx + 1] = -progress * 4.0 - 21.0;
        }
        targetsInitials[idx + 2] = (Math.random() - 0.5) * 2.0;
      }

      // State 4: Giant Climax Heart (perfectly centered for the proposal section)
      const tClimax = Math.PI * (2 * (i / count) - 1);
      const hxClimax = 16 * Math.pow(Math.sin(tClimax), 3);
      const hyClimax = 13 * Math.cos(tClimax) - 5 * Math.cos(2 * tClimax) - 2 * Math.cos(3 * tClimax) - Math.cos(4 * tClimax);
      const hzClimax = (Math.random() - 0.5) * 6;
      targetsRing[idx] = hxClimax * 0.72 + (Math.random() - 0.5) * 1.0;
      targetsRing[idx + 1] = (hyClimax + 6.0) * 0.72 - 30.0 + (Math.random() - 0.5) * 1.0; // Shift Y to match camera at scrollProgress=1.0
      targetsRing[idx + 2] = hzClimax;

      // Color spectrum values
      const ratio = i / count;
      let col;
      if (ratio < 0.35) col = teal.clone().lerp(white, ratio * 2.8);
      else if (ratio < 0.7) col = white.clone().lerp(pink, (ratio - 0.35) * 2.8);
      else col = pink.clone().lerp(gold, (ratio - 0.7) * 3.3);
      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aTargetPosition', new THREE.BufferAttribute(targetsHeart, 3));
    geo.setAttribute('aTargetPositionInitials', new THREE.BufferAttribute(targetsInitials, 3));
    geo.setAttribute('aTargetPositionRing', new THREE.BufferAttribute(targetsRing, 3));
    geo.setAttribute('aCustomColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aRandomSeed', new THREE.BufferAttribute(seeds, 1));

    this.particleUniforms = {
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
      uMousePos: { value: new THREE.Vector2(0, 0) },
      uMouseRadius: { value: 5.0 },
      uPortalDiveProgress: { value: 0.0 }
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: this.particleUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  createGlassHearts() {
    if (this.quality === 'low') return;

    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 1.2);
    heartShape.bezierCurveTo(0, 1.2, -1.2, 0, 0, -1.2);
    heartShape.bezierCurveTo(0, -1.2, 1.2, 0, 0, 1.2);
    
    const geo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.25,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.1,
      bevelThickness: 0.1
    });

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xff4a76,
      transparent: true,
      opacity: 0.12,
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
      transmission: 0.85,
      ior: 1.5,
      side: THREE.DoubleSide
    });

    const heartCount = this.quality === 'high' ? 10 : 5;
    for (let i = 0; i < heartCount; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 15 - 5);
      mesh.scale.setScalar(Math.random() * 0.5 + 0.2);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      this.scene.add(mesh);
      this.hearts.push(mesh);
    }
  }

  createCentralGlassHeart() {
    this.centerHeartGroup = new THREE.Group();
    this.centerHeartGroup.position.set(0, -30, 0);
    this.scene.add(this.centerHeartGroup);
    
    // Light inside the heart for a breathing fire/glow effect
    this.centerHeartLight = new THREE.PointLight(0xff0a4b, 0, 30);
    this.centerHeartGroup.add(this.centerHeartLight);
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    this.tealLight = new THREE.PointLight(0x3ec1b0, 3.0, 80);
    this.tealLight.position.set(15, 10, 10);
    this.scene.add(this.tealLight);
    this.pinkLight = new THREE.PointLight(0xff4a76, 3.5, 80);
    this.pinkLight.position.set(-15, -10, 10);
    this.scene.add(this.pinkLight);
    this.goldLight = new THREE.PointLight(0xffd25a, 0, 60);
    this.goldLight.position.set(0, 0, 15);
    this.scene.add(this.goldLight);
    this.centerHeartGroup.scale.set(0, 0, 0);
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

    // Particle drips crawling down the wall
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

  initPostProcessing() {
    if (this.quality === 'low') return;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloom = new BloomEffect({
      intensity: 4.8,
      luminanceThreshold: 0.02,
      luminanceSmoothing: 0.6,
      height: 720
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

  // ── DOM Gallery Sync Engine ──────────────────────────────────────
  initGallerySync() {
    const items = document.querySelectorAll('.gallery-item');
    if (!items.length) return;

    const textureLoader = new THREE.TextureLoader();

    items.forEach((item, index) => {
      const img = item.querySelector('.gallery-photo-img');
      const placeholder = item.querySelector('.gallery-placeholder');
      let texture;

      if (img && img.src) {
        texture = textureLoader.load(img.src);
      } else {
        // Emoji visual backup gradient texture mapping
        const emoji = placeholder ? placeholder.textContent : '💖';
        texture = this.createFallbackTexture(emoji);
      }

      const uniforms = {
        uTexture: { value: texture },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uHover: { value: 0.0 },
        uVelocity: { value: 0.0 },
        uTime: { value: 0.0 },
        uZoomProgress: { value: 0.0 }
      };

      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.ShaderMaterial({
        vertexShader: galleryVertexShader,
        fragmentShader: galleryFragmentShader,
        uniforms: uniforms,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);

      // Track references
      const record = {
        element: item,
        mesh: mesh,
        uniforms: uniforms,
        isZoomed: false,
        origPosition: new THREE.Vector3(),
        origScale: new THREE.Vector3()
      };

      this.galleryMeshes.push(record);

      // Mouse movements
      item.addEventListener('mouseenter', () => {
        gsap.to(uniforms.uHover, { value: 1.0, duration: 0.4 });
      });

      item.addEventListener('mousemove', (e) => {
        const rect = item.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width;
        const my = 1.0 - (e.clientY - rect.top) / rect.height;
        uniforms.uMouse.value.set(mx, my);

        // Map velocity parameters
        const vel = Math.min(1.0, (Math.abs(e.movementX) + Math.abs(e.movementY)) * 0.05);
        gsap.to(uniforms.uVelocity, { value: vel, duration: 0.1, overwrite: 'auto' });
      });

      item.addEventListener('mouseleave', () => {
        gsap.to(uniforms.uHover, { value: 0.0, duration: 0.6 });
        gsap.to(uniforms.uVelocity, { value: 0.0, duration: 0.6 });
      });

      // Zoom-to-focus click triggers
      item.addEventListener('click', () => {
        this.toggleZoom(record);
      });

      // Hide actual HTML visual components, leaving block structures layout clickable
      if (img) img.style.opacity = '0';
      if (placeholder) placeholder.style.opacity = '0';
    });
  }

  toggleZoom(record) {
    if (this.zoomedMesh && this.zoomedMesh !== record) {
      // Unzoom currently open mesh first
      this.toggleZoom(this.zoomedMesh);
    }

    const tSpeed = 1.4;
    const fovRad = (this.camera.fov * Math.PI) / 360;
    const heightAtFocus = 2 * Math.tan(fovRad) * 10; // Zoom up close to depth z = 20
    const widthAtFocus = heightAtFocus * this.camera.aspect;

    if (!record.isZoomed) {
      // Zoom In Sequence
      record.isZoomed = true;
      this.zoomedMesh = record;

      // Lock DOM scroll
      window.dispatchEvent(new CustomEvent('gallery-lock-scroll', { detail: { lock: true } }));
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'focus-muffle-active' } }));

      // Animate uniforms and coordinates
      gsap.to(record.uniforms.uZoomProgress, { value: 1.0, duration: tSpeed, ease: 'power2.inOut' });

      // Move mesh relative to camera viewport
      gsap.to(record.mesh.position, {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z - 10, // Bring right in front of camera lens
        duration: tSpeed,
        ease: 'power3.inOut'
      });

      gsap.to(record.mesh.scale, {
        x: widthAtFocus * 0.85,
        y: heightAtFocus * 0.85,
        z: 1,
        duration: tSpeed,
        ease: 'power3.inOut'
      });
    } else {
      // Zoom Out Sequence
      record.isZoomed = false;
      this.zoomedMesh = null;

      window.dispatchEvent(new CustomEvent('gallery-lock-scroll', { detail: { lock: false } }));
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'focus-muffle-inactive' } }));

      gsap.to(record.uniforms.uZoomProgress, { value: 0.0, duration: tSpeed, ease: 'power2.inOut' });

      gsap.to(record.mesh.position, {
        x: record.origPosition.x,
        y: record.origPosition.y,
        z: record.origPosition.z,
        duration: tSpeed,
        ease: 'power3.inOut'
      });

      gsap.to(record.mesh.scale, {
        x: record.origScale.x,
        y: record.origScale.y,
        z: 1,
        duration: tSpeed,
        ease: 'power3.inOut'
      });
    }
  }

  createFallbackTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#060612');
    grad.addColorStop(0.5, '#1e0c18');
    grad.addColorStop(1, '#0c0308');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(255, 140, 163, 0.18)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 256, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '130px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji || '💖', 256, 256);

    return new THREE.CanvasTexture(canvas);
  }

  updateGallerySync() {
    if (this.fallback) return;

    // Viewport frustum metrics at depth 0
    const fovRad = (this.camera.fov * Math.PI) / 360;
    const heightAtDepth = 2 * Math.tan(fovRad) * this.camera.position.z;
    const widthAtDepth = heightAtDepth * this.camera.aspect;

    this.galleryMeshes.forEach((record) => {
      // Don't update coordinates of zoomed mesh (let GSAP control it)
      if (record.isZoomed) return;

      const rect = record.element.getBoundingClientRect();

      // Convert DOM coordinates to WebGL space units
      const w = rect.width * (widthAtDepth / window.innerWidth);
      const h = rect.height * (heightAtDepth / window.innerHeight);

      const x = (rect.left + rect.width / 2 - window.innerWidth / 2) * (widthAtDepth / window.innerWidth);
      const y = (-(rect.top + rect.height / 2 - window.innerHeight / 2) * (heightAtDepth / window.innerHeight)) + this.camera.position.y;

      // Update positions and scale parameters
      record.mesh.position.set(x, y, 0);
      record.mesh.scale.set(w, h, 1);

      // Keep record of original vectors for zoom restoring calculations
      record.origPosition.copy(record.mesh.position);
      record.origScale.copy(record.mesh.scale);
    });
  }

  updateScroll(progress) { this.scrollProgress = progress; }
  onMouseMove(x, y) { this.mouse.set(x, y); }

  onResize() {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  animate() {
    if (this.fallback) return;
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Update particle uniforms
    if (this.particleUniforms) {
      this.particleUniforms.uTime.value = time;
      this.particleUniforms.uScrollProgress.value = this.scrollProgress;
      this.particleUniforms.uMousePos.value.copy(this.smoothMouse);
    }

    // Gentle particle cosmos rotation
    if (this.particles) {
      this.particles.rotation.y = time * 0.015 + this.scrollProgress * 0.4;
      this.particles.rotation.x = Math.sin(time * 0.008) * 0.08;
    }

    // Animate glass hearts
    this.hearts.forEach((heart, idx) => {
      heart.rotation.y += delta * 0.2;
      heart.rotation.x += delta * 0.08;
      heart.position.y += Math.sin(time * 0.6 + idx * 1.5) * 0.008;
      heart.material.opacity = 0.08 + this.scrollProgress * 0.2;
    });

    // Animate central heart group and light
    if (this.centerHeartGroup) {
      // Position the 3D climax group relative to camera Y scroll progress
      this.centerHeartGroup.position.y = -this.scrollProgress * 30;

      if (this.centerHeartLight) {
        if (this.scrollProgress >= 0.7) {
          const pulseIntensity = 8.0 + 12.0 * Math.pow(Math.sin(time * 2.5), 4.0);
          this.centerHeartLight.intensity = pulseIntensity;
        } else {
          this.centerHeartLight.intensity = 0;
        }
      }
      
      // Scale group in at final scroll and add the heartbeat pulse
      const baseScale = THREE.MathUtils.clamp((this.scrollProgress - 0.7) * 4.0, 0, 1);
      let pulse = 1.0;
      if (this.scrollProgress >= 0.8) {
        // Double-beat pulse (normal heartbeat rhythm: lub-dub)
        pulse = 1.0 + 0.08 * Math.pow(Math.sin(time * 2.5), 4.0) + 0.04 * Math.pow(Math.sin(time * 2.5 + 0.3), 4.0);
      }
      const finalScale = baseScale * pulse;
      this.centerHeartGroup.scale.set(finalScale, finalScale, finalScale);
    }

    // Update Love Wall uniforms and drip particles
    if (this.loveWallUniforms) {
      this.loveWallUniforms.uTime.value = time;
      this.loveWallUniforms.uScroll.value = this.scrollProgress;
    }

    if (this.wallDripPoints) {
      const arr = this.wallDripPoints.geometry.attributes.position.array;
      const vis = this.scrollProgress >= 0.2 && this.scrollProgress <= 0.95;
      this.wallDripPoints.material.opacity += ((vis ? 0.44 : 0.0) - this.wallDripPoints.material.opacity) * 0.08;
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

    // Update Dribble Tubes in the background of Poem and Mirror scenes (scroll 0.32 to 0.62)
    if (this.dribbleTubes) {
      const isDribbleActive = this.scrollProgress >= 0.32 && this.scrollProgress <= 0.62;
      this.dribbleTubes.mesh.visible = isDribbleActive;
      if (isDribbleActive) {
        this.dribbleTubes.setMouseNDC(this.smoothMouse.x, this.smoothMouse.y);
        this.dribbleTubes.update(this.camera);
      }
    }

    // Smooth mouse parallax interpolation
    this.smoothMouse.lerp(this.mouse, 0.06);
    this.camera.position.x = this.smoothMouse.x * 5;

    // Zoom/camera displacement maps to scroll depth
    let targetCamY = -this.scrollProgress * 30;
    
    // Late-scroll camera framing to keep final heart perfectly centered in middle of viewport
    if (this.scrollProgress > 0.85) {
      targetCamY = -30.0;
    }
    
    this.camera.position.y = targetCamY + this.smoothMouse.y * 3;
    this.camera.fov = 60 - this.scrollProgress * 15;
    this.camera.updateProjectionMatrix();

    // Color shift lights with scroll
    if (this.tealLight) {
      this.tealLight.intensity = 3.0 * (1 - this.scrollProgress * 0.5);
      this.pinkLight.intensity = 2.0 + this.scrollProgress * 3.0;
      this.goldLight.intensity = this.scrollProgress * 4.0;
    }

    // Render pass
    if (this.composer && this.quality !== 'low') {
      this.composer.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  createParametricHeartGeometry(seg = 48) {
    const A = 16, B = 5, C = 2, D = 1, E = 15.5;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals  = [];
    const uvs      = [];
    const indices  = [];

    /* sample the parametric surface */
    for (let j = 0; j <= seg; j++) {
      const v = (j / seg) * Math.PI * 2;
      for (let i = 0; i <= seg; i++) {
        const u = (i / seg) * Math.PI * 2;

        const r = A * Math.cos(v) - B * Math.cos(2 * v) - C * Math.cos(3 * v) - D * Math.cos(4 * v);
        const x = Math.sin(u) * r;
        const y = Math.cos(u) * r;
        const z = E * Math.sin(v);

        vertices.push(x, y, z);
        uvs.push(i / seg, j / seg);

        /* approximate normal via finite differences */
        const eps = 0.001;
        const uE = u + eps, vE = v + eps;
        const rV  = A * Math.cos(vE) - B * Math.cos(2 * vE) - C * Math.cos(3 * vE) - D * Math.cos(4 * vE);
        const dxdu = Math.cos(u) * r;
        const dydu = -Math.sin(u) * r;
        const dzdu = 0;
        const dxdv = Math.sin(u) * (
          -A * Math.sin(v) + 2 * B * Math.sin(2 * v) + 3 * C * Math.sin(3 * v) + 4 * D * Math.sin(4 * v)
        );
        const dydv = Math.cos(u) * (
          -A * Math.sin(v) + 2 * B * Math.sin(2 * v) + 3 * C * Math.sin(3 * v) + 4 * D * Math.sin(4 * v)
        );
        const dzdv = E * Math.cos(v);

        /* cross product for surface normal */
        let nx = dydu * dzdv - dzdu * dydv;
        let ny = dzdu * dxdv - dxdu * dzdv;
        let nz = dxdu * dydv - dydu * dxdv;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        normals.push(nx / len, ny / len, nz / len);
      }
    }

    /* build triangle indices */
    for (let j = 0; j < seg; j++) {
      for (let i = 0; i < seg; i++) {
        const a = j * (seg + 1) + i;
        const b = a + 1;
        const c = a + (seg + 1);
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.center();
    return geometry;
  }

  destroy() {
    this.renderer?.dispose();
    this.composer?.dispose();
    if (this.dribbleTubes && this.dribbleTubes.mesh) {
      this.dribbleTubes.mesh.geometry.dispose();
      this.dribbleTubes.mesh.material.dispose();
      this.scene.remove(this.dribbleTubes.mesh);
    }
  }
}

