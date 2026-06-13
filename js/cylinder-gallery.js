/**
 * CylinderGallery — Standalone 3D Cylindrical image gallery.
 * Maps photographs as curved texture panels on a rotating cylinder.
 * Supports scroll-to-rotate, mouse drag/swipe to spin, and click-to-dive camera zoom.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Timer } from './utils.js';
import cylinderVertexShader from './shaders/cylinder-vert.glsl';
import cylinderFragmentShader from './shaders/cylinder-frag.glsl';

gsap.registerPlugin(ScrollTrigger);

export class CylinderGallery {
  constructor(container, items) {
    this.container = container;
    this.canvas = container.querySelector('#cylinder-gallery-canvas');
    this.items = items || [];
    this.fallback = false;
    this.meshes = [];

    // Animation/State variables
    this.isZoomed = false;
    this.zoomedIndex = -1;
    this.clock = new Timer();
    this.mouse = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();

    // Drag variables
    this.isDragging = false;
    this.previousMouseX = 0;
    this.targetRotationY = 0;
    this.dragSpeed = 0.005;

    // Hover variables
    this.hoveredMesh = null;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true
      });
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.warn('WebGL CylinderGallery init failed:', e);
      this.fallback = true;
    }
  }

  init() {
    if (this.fallback || !this.canvas) {
      this.showCSSFallback();
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
    // Camera positioned back to frame the entire cylinder carousel
    this.camera.position.set(0, 0, 11);

    this.cylinderGroup = new THREE.Group();
    this.scene.add(this.cylinderGroup);

    this.loadGalleryPanels();
    this.createLights();
    this.bindEvents();
    this.initScrollTrigger();

    this.animate();
  }

  loadGalleryPanels() {
    const loader = new THREE.TextureLoader();
    const count = this.items.length;
    const radius = 5.0; // Radius of the cylinder

    // Curated glow colors for the cards (Teal and Pink alternations)
    const glowColors = [
      new THREE.Color(0x3ec1b0), // Teal
      new THREE.Color(0xff4a76), // Rose
      new THREE.Color(0xffd25a), // Gold
      new THREE.Color(0xff8ca3), // Pink
      new THREE.Color(0x3ec1b0), // Teal
      new THREE.Color(0xff4a76)  // Rose
    ];

    // High detail plane geometry to allow smooth vertex bending
    const planeGeo = new THREE.PlaneGeometry(3.2, 4.0, 30, 30);

    this.items.forEach((item, i) => {
      // Load texture, use emoji placeholder if image fails or is missing
      const texture = item.image ? loader.load(item.image) : null;

      const uniforms = {
        uTexture: { value: texture },
        uHasTexture: { value: texture ? 1.0 : 0.0 },
        uIsVideo: { value: 1.0 }, // enable animated video-like graphics
        uTime: { value: 0 },
        uHover: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uBendAmount: { value: 1.0 },
        uGlowColor: { value: glowColors[i % glowColors.length] },
        uCylinderRadius: { value: radius },
        uTwistK: { value: 0.0 },
        uTwistAmp: { value: 0.0 }
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: cylinderVertexShader,
        fragmentShader: cylinderFragmentShader,
        uniforms: uniforms,
        side: THREE.DoubleSide,
        transparent: true
      });

      const mesh = new THREE.Mesh(planeGeo, mat);

      // Arrange in a cylinder circle
      const angle = (i / count) * Math.PI * 2;
      mesh.position.set(
        radius * Math.sin(angle),
        0,
        radius * Math.cos(angle)
      );

      // Rotate to face outward from the center
      mesh.rotation.y = angle;

      // Keep track of details for overlays
      mesh.userData = {
        index: i,
        angle: angle,
        caption: item.caption,
        emoji: item.emoji || '💖',
        originalPos: mesh.position.clone(),
        originalRot: mesh.rotation.clone()
      };

      this.cylinderGroup.add(mesh);
      this.meshes.push(mesh);
    });
  }

  createLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(0, 5, 10);
    this.scene.add(dirLight);

    // Spotlight to illuminate active panel
    this.spotLight = new THREE.SpotLight(0xffffff, 4.0, 20, Math.PI / 4, 0.5, 1.0);
    this.spotLight.position.set(0, 0, 10);
    this.scene.add(this.spotLight);
  }

  initScrollTrigger() {
    // Map scroll through the memory chapter to the cylinder rotation.
    ScrollTrigger.create({
      trigger: '#scene-memories',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.0,
      onUpdate: (self) => {
        if (!this.isZoomed && !this.isDragging) {
          // 1 full spin across the entire section scroll
          this.targetRotationY = self.progress * Math.PI * 2.0;
        }
      }
    });
  }

  bindEvents() {
    const canvas = this.canvas;

    // Mouse Move for Hover raycasting
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

    // Click for Raycast Zoom
    canvas.addEventListener('click', this.onClick.bind(this));

    // Touch/Drag Spin support
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onDragMove.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isZoomed) return;

    // Hover detection
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

  // Drag-to-spin mechanisms
  onMouseDown(e) {
    if (this.isZoomed) return;
    this.isDragging = true;
    this.previousMouseX = e.clientX;
  }

  onDragMove(e) {
    if (!this.isDragging || this.isZoomed) return;
    const deltaX = e.clientX - this.previousMouseX;
    this.targetRotationY += deltaX * this.dragSpeed;
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
    this.targetRotationY += deltaX * this.dragSpeed;
    this.previousMouseX = e.touches[0].clientX;
  }

  onTouchEnd() {
    this.isDragging = false;
  }

  diveInside(mesh) {
    this.isZoomed = true;
    this.zoomedIndex = mesh.userData.index;

    const item = this.items[mesh.userData.index] || {};

    // Dispatch events to mute/sweep audio and block body scroll
    window.dispatchEvent(new CustomEvent('gallery-dive-in', {
      detail: {
        index: mesh.userData.index,
        caption: mesh.userData.caption,
        emoji: mesh.userData.emoji,
        date: item.date || '',
        story: item.story || '',
        previewUrl: item.image || '',
        videoSrc: item.video || ''
      }
    }));

    // Trigger subtle click sound
    window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'section-chime' } }));

    // Stop cursor hover styling
    document.body.classList.remove('cursor-hover');

    // 1. Rotate cylinder group so the target mesh faces the camera directly (angle rotation = -mesh.userData.angle)
    // Wrap target rotation to keep it clean
    const currentRot = this.cylinderGroup.rotation.y;
    const targetRot = -mesh.userData.angle;
    // Find closest angle path
    const diff = Math.atan2(Math.sin(targetRot - currentRot), Math.cos(targetRot - currentRot));

    const tl = gsap.timeline();

    tl.to(this.cylinderGroup.rotation, {
      y: currentRot + diff,
      duration: 1.2,
      ease: 'power2.inOut'
    }, 0);

    // 2. Animate camera zoom into the panel
    // Move closer along Z and tilt slightly
    tl.to(this.camera.position, {
      z: 6.8, // zoom closer to the panel
      y: 0.1,
      duration: 1.4,
      ease: 'power3.inOut'
    }, 0);

    // 3. Flatten target card slightly for easier reading (reduce bend)
    tl.to(mesh.material.uniforms.uBendAmount, {
      value: 0.05,
      duration: 1.0,
      ease: 'power2.out'
    }, 0.2);

    // 4. Slightly fade other cards
    this.meshes.forEach((m) => {
      if (m !== mesh) {
        tl.to(m.material.uniforms.uOpacity, {
          value: 0.15,
          duration: 0.8
        }, 0);
      }
    });
  }

  comeOutside() {
    if (!this.isZoomed) return;

    // Zoom back out timeline
    const activeMesh = this.meshes[this.zoomedIndex];

    const tl = gsap.timeline({
      onComplete: () => {
        this.isZoomed = false;
        this.zoomedIndex = -1;
      }
    });

    // 1. Move camera back to initial framing
    tl.to(this.camera.position, {
      x: 0,
      y: 0,
      z: 11,
      duration: 1.2,
      ease: 'power2.inOut'
    }, 0);

    // 2. Restore bending on the card
    if (activeMesh) {
      tl.to(activeMesh.material.uniforms.uBendAmount, {
        value: 1.0,
        duration: 1.0,
        ease: 'power2.out'
      }, 0);
    }

    // 3. Restore opacities on all cards
    this.meshes.forEach((m) => {
      tl.to(m.material.uniforms.uOpacity, {
        value: 1.0,
        duration: 0.8
      }, 0);
    });

    // Reset target rotation tracking to match current rotation
    this.targetRotationY = this.cylinderGroup.rotation.y;

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

    // Rotate cylinder Y rotation towards target Y
    if (!this.isZoomed) {
      // Idle slow spin when no input, else lerp towards target scroll/drag position
      if (!this.isDragging && Math.abs(this.targetRotationY - this.cylinderGroup.rotation.y) < 0.001) {
        this.cylinderGroup.rotation.y += 0.0015; // Slow idle
        this.targetRotationY = this.cylinderGroup.rotation.y;
      } else {
        this.cylinderGroup.rotation.y += (this.targetRotationY - this.cylinderGroup.rotation.y) * 0.08;
      }
    }

    // Pass time uniform to materials for wavy wobbling effect
    this.meshes.forEach((mesh) => {
      mesh.material.uniforms.uTime.value = time;
    });

    // Render scene
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
    this.renderer?.dispose();
  }
}
