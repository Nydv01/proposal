/**
 * TunnelGallery — Immersive 3D Winding Spline Tunnel Memory Portal.
 * Drives camera travel through a curved stardust particle tunnel based on scroll progress.
 * Cards float on left/right curve tangents, supporting mouse hovers, drag swipes, and quaternion dives.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Timer } from './utils.js';
import tunnelVertexShader from './shaders/tunnel-vert.glsl';
import tunnelFragmentShader from './shaders/cylinder-frag.glsl';

gsap.registerPlugin(ScrollTrigger);

export class TunnelGallery {
  constructor(container, items) {
    this.container = container;
    this.canvas = container.querySelector('#cylinder-gallery-canvas');
    this.items = items || [];
    this.fallback = false;
    this.meshes = [];

    // State parameters
    this.isZoomed = false;
    this.zoomedIndex = -1;
    this.clock = new Timer();
    this.mouse = new THREE.Vector2(0, 0);
    this.smoothMouse = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();

    // Drag-to-slide speed
    this.isDragging = false;
    this.previousMouseX = 0;
    this.dragSpeed = 0.0006;

    // Scroll progress variables
    this.scrollProgress = 0.0;
    this.targetScrollProgress = 0.0;

    // Hover variables
    this.hoveredMesh = null;

    // Spline curve coordinates (S-winding tunnel through space)
    const points = [
      new THREE.Vector3(0, 3, 22),
      new THREE.Vector3(3.2, 1.2, 14),
      new THREE.Vector3(-3.8, -1.0, 6),
      new THREE.Vector3(4.0, 2.0, -2),
      new THREE.Vector3(-3.2, 0.0, -10),
      new THREE.Vector3(2.5, -2.0, -18),
      new THREE.Vector3(0, 0, -26)
    ];
    this.curve = new THREE.CatmullRomCurve3(points);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true
      });
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.warn('WebGL TunnelGallery init failed:', e);
      this.fallback = true;
    }
  }

  init() {
    if (this.fallback || !this.canvas) {
      this.showCSSFallback();
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 150);
    
    // Mount a container group for the tunnel cards
    this.tunnelGroup = new THREE.Group();
    this.scene.add(this.tunnelGroup);

    this.loadGalleryPanels();
    this.createLights();
    this.createTunnelParticles();
    this.bindEvents();
    this.initScrollTrigger();

    this.animate();
  }

  loadGalleryPanels() {
    const loader = new THREE.TextureLoader();
    const count = this.items.length;

    // Glow colors mapped to card indexes (warm pinks, teals, and soft gold shifts)
    const glowColors = [
      new THREE.Color(0x3ec1b0), // Teal
      new THREE.Color(0xff4a76), // Rose
      new THREE.Color(0xffd25a), // Gold
      new THREE.Color(0xff8ca3), // Pink
      new THREE.Color(0x3ec1b0), // Teal
      new THREE.Color(0xff4a76)  // Rose
    ];

    const planeGeo = new THREE.PlaneGeometry(3.2, 4.0, 32, 32);

    this.items.forEach((item, i) => {
      const texture = item.image ? loader.load(item.image) : null;

      const uniforms = {
        uTexture: { value: texture },
        uHasTexture: { value: texture ? 1.0 : 0.0 },
        uIsVideo: { value: 1.0 }, // enable ripple wave effects
        uTime: { value: 0 },
        uHover: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uBendAmount: { value: 0.0 }, // bypass cylinder bending
        uGlowColor: { value: glowColors[i % glowColors.length] },
        uCylinderRadius: { value: 5.0 },
        uTwistK: { value: 0.0 },
        uTwistAmp: { value: 0.0 }
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: tunnelVertexShader,
        fragmentShader: tunnelFragmentShader,
        uniforms: uniforms,
        side: THREE.DoubleSide,
        transparent: true
      });

      const mesh = new THREE.Mesh(planeGeo, mat);

      // Distribute items evenly along the winding curve
      // Space out items in the range t = [0.12, 0.87]
      const t = 0.12 + i * 0.15;
      const pos = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();

      // Shift position sideways from curve path normal vector to avoid direct camera collisions
      const upVector = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, upVector).normalize();
      
      // Alternate offsets left and right of camera spline trajectory
      const sideOffset = normal.clone().multiplyScalar(2.0 * (i % 2 === 0 ? 1 : -1));
      const vertOffset = new THREE.Vector3(0, Math.sin(i * 1.6) * 0.4, 0);

      mesh.position.copy(pos).add(sideOffset).add(vertOffset);

      // Make panels face forward towards incoming camera trajectory
      mesh.lookAt(pos.clone().add(tangent.clone().multiplyScalar(4.0)));

      // Save user metrics for detail overlays and quaternion flight
      mesh.userData = {
        index: i,
        t: t,
        caption: item.caption,
        emoji: item.emoji || '💖',
        date: item.date || '',
        story: item.story || '',
        image: item.image || '',
        video: item.video || '',
        originalPos: mesh.position.clone(),
        originalRot: mesh.rotation.clone()
      };

      this.tunnelGroup.add(mesh);
      this.meshes.push(mesh);
    });
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
    dirLight.position.set(0, 8, 12);
    this.scene.add(dirLight);

    // Spotlight pointing down curve to illuminate active cards
    this.spotLight = new THREE.SpotLight(0xffffff, 4.0, 30, Math.PI / 4, 0.5, 1.0);
    this.spotLight.position.set(0, 2, 12);
    this.scene.add(this.spotLight);
  }

  createTunnelParticles() {
    const particleCount = 1500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorTeal = new THREE.Color(0x3ec1b0);
    const colorPink = new THREE.Color(0xff4a76);
    const colorGold = new THREE.Color(0xffd25a);

    for (let i = 0; i < particleCount; i++) {
      // Scattered values along curve path length
      const t = Math.random();
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();

      // Circular ring offsets around the winding spline axis
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.2 + Math.random() * 4.0;

      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      const offset = new THREE.Vector3()
        .addScaledVector(normal, Math.cos(angle) * radius)
        .addScaledVector(binormal, Math.sin(angle) * radius);

      positions[i * 3] = p.x + offset.x;
      positions[i * 3 + 1] = p.y + offset.y;
      positions[i * 3 + 2] = p.z + offset.z;

      // Curated color distributions
      let col = colorTeal;
      const rng = Math.random();
      if (rng > 0.66) col = colorPink;
      else if (rng > 0.33) col = colorGold;

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 2.0 + 1.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, this.particleMaterial);
    this.scene.add(this.particles);
  }

  initScrollTrigger() {
    ScrollTrigger.create({
      trigger: '#scene-memories',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.0,
      onUpdate: (self) => {
        if (!this.isZoomed) {
          // Clamp scroll position map to spline progress length (0 to 1)
          this.targetScrollProgress = self.progress;
        }
      }
    });
  }

  bindEvents() {
    const canvas = this.canvas;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));

    // Mouse drag support
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onDragMove.bind(this));

    // Touch support
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isZoomed) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.meshes);

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
    } else {
      if (this.hoveredMesh) {
        gsap.to(this.hoveredMesh.material.uniforms.uHover, { value: 0.0, duration: 0.3 });
        this.hoveredMesh = null;
        document.body.classList.remove('cursor-hover');
      }
    }
  }

  onClick(e) {
    if (this.isZoomed) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      this.diveInside(hitMesh);
    }
  }

  onMouseDown(e) {
    if (this.isZoomed) return;
    this.isDragging = true;
    this.previousMouseX = e.clientX;
  }

  onDragMove(e) {
    if (!this.isDragging || this.isZoomed) return;
    const deltaX = e.clientX - this.previousMouseX;
    // Drag slides target progress forward/backward
    this.targetScrollProgress -= deltaX * this.dragSpeed;
    this.targetScrollProgress = THREE.MathUtils.clamp(this.targetScrollProgress, 0, 1);
    this.previousMouseX = e.clientX;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onTouchStart(e) {
    if (this.isZoomed || !e.touches.length) return;
    this.isDragging = true;
    this.previousMouseX = e.touches[0].clientX;
  }

  onTouchMove(e) {
    if (!this.isDragging || this.isZoomed || !e.touches.length) return;
    const deltaX = e.touches[0].clientX - this.previousMouseX;
    this.targetScrollProgress -= deltaX * this.dragSpeed;
    this.targetScrollProgress = THREE.MathUtils.clamp(this.targetScrollProgress, 0, 1);
    this.previousMouseX = e.touches[0].clientX;
  }

  onTouchEnd() {
    this.isDragging = false;
  }

  diveInside(mesh) {
    this.isZoomed = true;
    this.zoomedIndex = mesh.userData.index;

    // Dispatch event to main UI layer
    window.dispatchEvent(new CustomEvent('gallery-dive-in', {
      detail: {
        index: mesh.userData.index,
        caption: mesh.userData.caption,
        emoji: mesh.userData.emoji,
        date: mesh.userData.date,
        story: mesh.userData.story,
        previewUrl: mesh.userData.image,
        videoSrc: mesh.userData.video
      }
    }));

    window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'section-chime' } }));
    document.body.classList.remove('cursor-hover');

    // 1. Calculate flight target position (Z offset from mesh position relative to mesh orientation)
    const targetCamPos = new THREE.Vector3();
    const localZ = new THREE.Vector3(0, 0, 4.0); // 4 units in front along mesh normal
    localZ.applyQuaternion(mesh.quaternion);
    targetCamPos.copy(mesh.position).add(localZ);

    // 2. Calculate flight target orientation using temp lookAt calculation to quaternion
    const tempCam = this.camera.clone();
    tempCam.position.copy(targetCamPos);
    tempCam.lookAt(mesh.position);

    const tl = gsap.timeline();

    // Flight camera path movement
    tl.to(this.camera.position, {
      x: targetCamPos.x,
      y: targetCamPos.y,
      z: targetCamPos.z,
      duration: 1.4,
      ease: 'power3.inOut'
    }, 0);

    // Flight camera quaternion rotation
    tl.to(this.camera.quaternion, {
      x: tempCam.quaternion.x,
      y: tempCam.quaternion.y,
      z: tempCam.quaternion.z,
      w: tempCam.quaternion.w,
      duration: 1.4,
      ease: 'power3.inOut'
    }, 0);

    // 3. Fade out other mesh frames to emphasize focus
    this.meshes.forEach((m) => {
      if (m !== mesh) {
        tl.to(m.material.uniforms.uOpacity, {
          value: 0.12,
          duration: 0.8
        }, 0);
      }
    });

    // 4. Fade out tunnel background particles
    if (this.particles) {
      tl.to(this.particles.material, {
        opacity: 0.12,
        duration: 0.8
      }, 0);
    }
  }

  comeOutside() {
    if (!this.isZoomed) return;

    const activeMesh = this.meshes[this.zoomedIndex];

    const tl = gsap.timeline({
      onComplete: () => {
        this.isZoomed = false;
        this.zoomedIndex = -1;
      }
    });

    // 1. Calculate curve position coordinates to return camera
    const backCamPos = this.curve.getPointAt(this.scrollProgress);
    const lookTarget = this.curve.getPointAt(Math.min(this.scrollProgress + 0.08, 1.0));

    const tempCam = this.camera.clone();
    tempCam.position.copy(backCamPos);
    tempCam.lookAt(lookTarget);

    // Return camera coordinate path
    tl.to(this.camera.position, {
      x: backCamPos.x,
      y: backCamPos.y,
      z: backCamPos.z,
      duration: 1.2,
      ease: 'power2.inOut'
    }, 0);

    // Return camera orientation
    tl.to(this.camera.quaternion, {
      x: tempCam.quaternion.x,
      y: tempCam.quaternion.y,
      z: tempCam.quaternion.z,
      w: tempCam.quaternion.w,
      duration: 1.2,
      ease: 'power2.inOut'
    }, 0);

    // 2. Restore all mesh opacities
    this.meshes.forEach((m) => {
      tl.to(m.material.uniforms.uOpacity, {
        value: 1.0,
        duration: 0.8
      }, 0);
    });

    // 3. Restore background tunnel particles opacity
    if (this.particles) {
      tl.to(this.particles.material, {
        opacity: 0.7,
        duration: 0.8
      }, 0);
    }

    // Reset target scroll to sync
    this.targetScrollProgress = this.scrollProgress;

    window.dispatchEvent(new CustomEvent('gallery-dive-out'));
  }

  showCSSFallback() {
    const fallbackGrid = document.getElementById('gallery-grid');
    if (fallbackGrid) {
      fallbackGrid.style.display = 'grid';
    }
    const container = document.getElementById('cylinder-gallery-container');
    if (container) {
      container.style.display = 'none';
    }
  }

  animate() {
    if (this.fallback) return;
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Drive camera along curve if not zoomed in on card details
    if (!this.isZoomed) {
      // Smoothly interpolate scroll progress
      this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.06;

      const camPos = this.curve.getPointAt(this.scrollProgress);
      const lookTarget = this.curve.getPointAt(Math.min(this.scrollProgress + 0.08, 1.0));

      // 3D Moving Frenet Frame alignment for mouse parallax offset
      const tangent = this.curve.getTangentAt(this.scrollProgress).normalize();
      const upVec = new THREE.Vector3(0, 1, 0);
      const rightVec = new THREE.Vector3().crossVectors(tangent, upVec).normalize();
      const localUp = new THREE.Vector3().crossVectors(rightVec, tangent).normalize();

      // Smooth coordinate LERP for parallax
      this.smoothMouse.lerp(this.mouse, 0.06);

      const finalCamPos = camPos.clone()
        .addScaledVector(rightVec, this.smoothMouse.x * 0.6)
        .addScaledVector(localUp, this.smoothMouse.y * 0.6);

      this.camera.position.copy(finalCamPos);
      this.camera.lookAt(lookTarget.clone().addScaledVector(rightVec, this.smoothMouse.x * 0.2));
    }

    // Pass time uniform to panel materials for wave ripple sways
    this.meshes.forEach((mesh) => {
      mesh.material.uniforms.uTime.value = time;
    });

    // Render tunnel WebGL scene
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    if (this.fallback || !this.renderer || !this.camera) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    this.meshes.forEach((m) => {
      m.material?.dispose();
      m.material?.uniforms?.uTexture?.value?.dispose();
    });
    this.particles?.geometry?.dispose();
    this.particles?.material?.dispose();
    this.renderer?.dispose();
  }
}
