/**
 * EnvelopeScene — Cinematic 3D wax-sealed envelope entry experience.
 * Features: 1200+ floating dust particles, volumetric wax seal, ribbon tie,
 * camera zoom, and audio initiation triggers.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect } from 'postprocessing';
import { Timer } from './utils.js';
import envelopeVertexShader from './shaders/envelope-vert.glsl';
import envelopeFragmentShader from './shaders/envelope-frag.glsl';

export class EnvelopeScene {
  constructor(container, { onOpenComplete } = {}) {
    this.container = container;
    this.canvas = container.querySelector('#envelope-canvas');
    this.onOpenComplete = onOpenComplete ?? null;
    this.mouse = new THREE.Vector2(0, 0);
    this.targetRotation = new THREE.Vector2(0, 0);
    this.clock = new Timer();
    this.isOpened = false;

    this.dustParticles = null;
    this.burstParticles = null;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.z = 9.5;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.raycaster = new THREE.Raycaster();
    this.composer = null;
  }

  init() {
    this.envelopeGroup = new THREE.Group();
    this.scene.add(this.envelopeGroup);

    // Uniforms and custom shader material
    this.envelopeUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xd7bf9e) }, // Warm paper kraft color
      uOpacity: { value: 1.0 }
    };

    this.paperMaterial = new THREE.ShaderMaterial({
      vertexShader: envelopeVertexShader,
      fragmentShader: envelopeFragmentShader,
      uniforms: this.envelopeUniforms,
      side: THREE.DoubleSide,
      transparent: true
    });

    this.createStarfield();

    // 1. Envelope body — thick layered paper stack
    const bodyGeo = new THREE.PlaneGeometry(4.5, 3.0, 48, 48);
    const body = new THREE.Mesh(bodyGeo, this.paperMaterial);
    body.position.z = 0.01;
    this.envelopeGroup.add(body);

    const bodyBack = new THREE.Mesh(bodyGeo, this.paperMaterial.clone());
    bodyBack.position.z = -0.06;
    bodyBack.rotation.y = Math.PI;
    this.envelopeGroup.add(bodyBack);

    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x8a7358,
      roughness: 0.9,
      metalness: 0.05
    });
    const sideGeo = new THREE.BoxGeometry(4.52, 3.02, 0.08);
    const sideMesh = new THREE.Mesh(sideGeo, edgeMat);
    sideMesh.position.z = -0.03;
    this.envelopeGroup.add(sideMesh);

    // 2. Pocket back fold
    const pocketGeo = new THREE.BufferGeometry();
    const pocketVerts = new Float32Array([
      -2.25, -1.5, 0.04,
      2.25, -1.5, 0.04,
      2.25, 0.2, 0.04,
      -2.25, 0.2, 0.04
    ]);
    pocketGeo.setAttribute('position', new THREE.BufferAttribute(pocketVerts, 3));
    pocketGeo.setIndex([0, 1, 2, 0, 2, 3]);
    pocketGeo.computeVertexNormals();
    const pocket = new THREE.Mesh(pocketGeo, this.paperMaterial);
    this.envelopeGroup.add(pocket);

    // 3. Ribbon wrapping crossing
    // Wrapping the envelope horizontally and vertically like a ribbon
    this.ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xb31c3c, // Deep red ribbon
      roughness: 0.75,
      metalness: 0.15
    });
    const ribHoriz = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.32, 8, 2), this.ribbonMat);
    ribHoriz.position.set(0, 0, 0.055);
    this.envelopeGroup.add(ribHoriz);

    const ribVert = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 3.0, 2, 8), this.ribbonMat);
    ribVert.position.set(0, 0, 0.052);
    this.envelopeGroup.add(ribVert);

    const bowGeo = new THREE.TorusKnotGeometry(0.22, 0.06, 64, 12);
    const bow = new THREE.Mesh(bowGeo, this.ribbonMat.clone());
    bow.position.set(0, 0.05, 0.09);
    bow.scale.set(1.4, 1.0, 0.5);
    this.envelopeGroup.add(bow);

    this.innerLetter = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.4, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0xfff8ef,
        roughness: 0.85,
        emissive: 0xffeedd,
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.92
      })
    );
    this.innerLetter.position.set(0, -0.15, -0.02);
    this.envelopeGroup.add(this.innerLetter);

    // 4. Triangular flap with pivot (for rotation)
    this.flapPivot = new THREE.Group();
    this.flapPivot.position.set(0, 1.5, 0.02);
    this.envelopeGroup.add(this.flapPivot);

    const flapGeo = new THREE.BufferGeometry();
    const flapVerts = new Float32Array([
      -2.25, 0, 0,
      2.25, 0, 0,
      0, -1.5, 0
    ]);
    flapGeo.setAttribute('position', new THREE.BufferAttribute(flapVerts, 3));
    flapGeo.setIndex([0, 1, 2]);
    flapGeo.computeVertexNormals();
    this.flapMesh = new THREE.Mesh(flapGeo, this.paperMaterial);
    this.flapPivot.add(this.flapMesh);

    // 5. Volumetric Wax Seal (Group of Base + Lip + Logo)
    this.sealGroup = new THREE.Group();
    this.sealGroup.position.set(0, -1.5, 0.06);
    this.flapPivot.add(this.sealGroup);

    this.sealMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3b58,
      roughness: 0.22,
      metalness: 0.12,
      emissive: 0x220002,
      emissiveIntensity: 0.2
    });

    // Cylinder base
    const baseGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.05, 32);
    baseGeo.rotateX(Math.PI / 2);
    const baseMesh = new THREE.Mesh(baseGeo, this.sealMaterial);
    this.sealGroup.add(baseMesh);

    // Torus lip
    const lipGeo = new THREE.TorusGeometry(0.38, 0.045, 12, 32);
    const lipMesh = new THREE.Mesh(lipGeo, this.sealMaterial);
    lipMesh.position.z = 0.025;
    this.sealGroup.add(lipMesh);

    // Heart Logo seal emboss
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0.12);
    heartShape.bezierCurveTo(0.12, 0.2, 0.2, 0.05, 0, -0.15);
    heartShape.bezierCurveTo(-0.2, 0.05, -0.12, 0.2, 0, 0.12);
    const logoGeo = new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.015,
      bevelThickness: 0.015
    });
    logoGeo.center();
    logoGeo.rotateX(Math.PI); // Orient correctly

    this.logoMesh = new THREE.Mesh(logoGeo, this.sealMaterial);
    this.logoMesh.position.set(0, 0, 0.045);
    this.logoMesh.scale.setScalar(0.75);
    this.sealGroup.add(this.logoMesh);

    this.createDustParticles();
    this.createAmbientDripParticles();
    this.initEnvelopePost();

    this.scene.add(new THREE.AmbientLight(0xfff5e8, 0.45));

    const dirLight = new THREE.DirectionalLight(0xfff0dd, 1.1);
    dirLight.position.set(4, 5, 6);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xff8ca3, 0.55);
    rimLight.position.set(-5, 2, -4);
    this.scene.add(rimLight);

    // Warm light representing candle glow
    this.candleLight = new THREE.PointLight(0xffaa44, 1.5, 18);
    this.candleLight.position.set(0, 0, 4);
    this.scene.add(this.candleLight);

    // Soft pink side accent
    this.pinkLight = new THREE.PointLight(0xff5e7e, 0.6, 12);
    this.pinkLight.position.set(3, -2, 2);
    this.scene.add(this.pinkLight);

    // Bind events
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('touchstart', this.onTouch.bind(this), { passive: true });
    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  createStarfield() {
    const count = 2200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = -8 - Math.random() * 40;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starfield = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.06,
      color: 0xffeedd,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.scene.add(this.starfield);
  }

  initEnvelopePost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new BloomEffect({
      intensity: 1.8,
      luminanceThreshold: 0.12,
      luminanceSmoothing: 0.5
    });
    const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.65 });
    this.composer.addPass(new EffectPass(this.camera, bloom, vignette));
  }

  createAmbientDripParticles() {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = 4 + Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._dripVel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this._dripVel[i * 3 + 1] = -0.01 - Math.random() * 0.02;
    }
    this.dripParticles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.08,
      color: 0xff8ca3,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.scene.add(this.dripParticles);
  }

  createDustParticles() {
    const count = 3200;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;

      // Floating speeds
      velocities[i * 3] = (Math.random() - 0.5) * 0.006;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004;

      sizes[i] = 0.02 + Math.random() * 0.05;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._dustVelocities = velocities;

    const mat = new THREE.PointsMaterial({
      size: 0.055,
      color: 0xffeacc, // Warm golden dust
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.dustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dustParticles);
  }

  createBurstParticles() {
    // Large seal explosion particles
    const count = 650;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const sealWorldPos = new THREE.Vector3();
    if (this.sealGroup?.children[0]) {
      this.sealGroup.children[0].getWorldPosition(sealWorldPos);
    }

    for (let i = 0; i < count; i++) {
      positions[i * 3] = sealWorldPos.x;
      positions[i * 3 + 1] = sealWorldPos.y;
      positions[i * 3 + 2] = sealWorldPos.z;

      // Explode radially
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const speed = 0.04 + Math.random() * 0.16;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;

      // Warm pinks, golds, and rose colors
      const rVal = Math.random();
      if (rVal < 0.4) {
        // Rose
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.23; colors[i * 3 + 2] = 0.35;
      } else if (rVal < 0.7) {
        // Gold
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.82; colors[i * 3 + 2] = 0.35;
      } else {
        // Pink
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.55; colors[i * 3 + 2] = 0.64;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this._burstVelocities = velocities;
    this._burstLife = 0;

    const mat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.burstParticles = new THREE.Points(geo, mat);
    this.scene.add(this.burstParticles);
  }

  onMouseMove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.targetRotation.x = -this.mouse.y * 0.18;
    this.targetRotation.y = this.mouse.x * 0.28;
  }

  onTouch(e) {
    if (this.isOpened || !e.touches.length) return;
    const touch = e.touches[0];
    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.sealGroup.children, true);
    if (intersects.length > 0) this.openEnvelope();
  }

  onClick(e) {
    if (this.isOpened) return;
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.sealGroup.children, true);
    if (intersects.length > 0) this.openEnvelope();
  }

  openEnvelope() {
    if (this.isOpened) return;
    this.isOpened = true;

    // Let GSAP drive interactivity; keep container visible during cinematic
    this.container.classList.add('pointer-events-none');

    // Trigger cracking sound event
    window.dispatchEvent(new CustomEvent('play-sound', { detail: { name: 'wax-seal-crack' } }));

    // Spawn burst particle explosion
    this.createBurstParticles();

    const tl = gsap.timeline({
      onComplete: () => {
        // Hand control to main scroll experience right as we finish the dive
        if (this.onOpenComplete) this.onOpenComplete();
        // Then gracefully hide the envelope container
        this.container.classList.add('hidden');
      }
    });

    // 1. Wax Seal micro-zoom + crack
    tl.to(this.sealGroup.scale, {
      x: 1.25, y: 1.25, z: 1.25,
      duration: 0.35,
      ease: 'power3.out'
    }, 0);

    this.sealGroup.children.forEach((mesh) => {
      tl.to(mesh.material, {
        opacity: 0,
        transparent: true,
        duration: 0.4
      }, 0.25);
    });

    // 2. Letter reveal — glide slightly out as flap opens
    if (this.innerLetter) {
      tl.to(this.innerLetter.position, { z: 0.42, y: 0.22, duration: 1.4, ease: 'power2.out' }, 0.35);
      tl.to(this.innerLetter.material, { emissiveIntensity: 0.65, duration: 1.0 }, 0.5);
    }

    tl.to(this.flapPivot.rotation, {
      x: Math.PI * 0.96,
      duration: 1.8,
      ease: 'back.inOut(1.6)'
    }, 0.25);

    // 3. Camera glides forward towards the glowing letter (not instantly behind)
    tl.to(this.camera.position, {
      z: 2.2,
      y: 0.18,
      duration: 1.6,
      ease: 'power4.inOut'
    }, 0.7);

    // Fade the envelope paper shader opacity to reveal cosmos behind instead of a flat white
    tl.to(this.envelopeUniforms.uOpacity, {
      value: 0.0,
      duration: 1.0,
      ease: 'power2.inOut'
    }, 0.9);

    // Fade the ribbon material to transparent
    if (this.ribbonMat) {
      tl.to(this.ribbonMat, {
        opacity: 0,
        transparent: true,
        duration: 0.9
      }, 0.9);
    }

    // 4. Dust + ambient drips collapse into darkness instead of flashing
    if (this.dustParticles) {
      tl.to(this.dustParticles.material, {
        opacity: 0,
        duration: 0.9
      }, 1.0);
    }
    if (this.dripParticles) {
      tl.to(this.dripParticles.material, {
        opacity: 0,
        duration: 0.9
      }, 1.0);
    }

    // 5. Very soft container fade, slightly after world is already dark
    tl.to(this.container, {
      opacity: 0,
      duration: 1.2,
      ease: 'power3.inOut'
    }, 1.6);
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  animate() {
    if (this.isOpened && parseFloat(this.container.style.opacity) <= 0) return;
    requestAnimationFrame(this.animate.bind(this));

    const time = this.clock.getElapsedTime();
    this.envelopeUniforms.uTime.value = time;

    // Candle point light flicker simulation
    if (this.candleLight) {
      this.candleLight.intensity = 1.4 + Math.sin(time * 6.0) * 0.25 + Math.cos(time * 12.0) * 0.15;
      this.candleLight.position.x = Math.sin(time * 1.5) * 0.15;
    }

    // Subtle breathing mouse parallax when closed
    if (!this.isOpened) {
      this.envelopeGroup.rotation.x += (this.targetRotation.x - this.envelopeGroup.rotation.x) * 0.08;
      this.envelopeGroup.rotation.y += (this.targetRotation.y - this.envelopeGroup.rotation.y) * 0.08;
      this.envelopeGroup.position.y = Math.sin(time * 1.1) * 0.1;
      this.envelopeGroup.position.x = Math.cos(time * 0.65) * 0.04;
    }

    if (this.starfield) {
      this.starfield.rotation.z = time * 0.004;
    }

    if (this.dripParticles && !this.isOpened) {
      const dp = this.dripParticles.geometry.attributes.position;
      for (let i = 0; i < dp.count; i++) {
        dp.array[i * 3 + 1] += this._dripVel[i * 3 + 1];
        if (dp.array[i * 3 + 1] < -8) {
          dp.array[i * 3 + 1] = 8 + Math.random() * 4;
          dp.array[i * 3] = (Math.random() - 0.5) * 14;
        }
      }
      dp.needsUpdate = true;
    }

    if (this.dustParticles) {
      const dustPos = this.dustParticles.geometry.attributes.position;
      for (let i = 0; i < dustPos.count; i++) {
        dustPos.array[i * 3] += this._dustVelocities[i * 3];
        dustPos.array[i * 3 + 1] += this._dustVelocities[i * 3 + 1] + 0.0012; // slow drift upwards
        dustPos.array[i * 3 + 2] += this._dustVelocities[i * 3 + 2];

        // Loop boundary coordinates
        if (Math.abs(dustPos.array[i * 3]) > 12) dustPos.array[i * 3] *= -0.9;
        if (Math.abs(dustPos.array[i * 3 + 1]) > 9) dustPos.array[i * 3 + 1] *= -0.9;
      }
      dustPos.needsUpdate = true;
    }

    // Animate seal explosion particles
    if (this.burstParticles) {
      this._burstLife += 0.016;
      const burstPos = this.burstParticles.geometry.attributes.position;

      for (let i = 0; i < burstPos.count; i++) {
        burstPos.array[i * 3] += this._burstVelocities[i * 3];
        burstPos.array[i * 3 + 1] += this._burstVelocities[i * 3 + 1];
        burstPos.array[i * 3 + 2] += this._burstVelocities[i * 3 + 2];

        // Air resistance slow down
        this._burstVelocities[i * 3] *= 0.965;
        this._burstVelocities[i * 3 + 1] *= 0.965;
        this._burstVelocities[i * 3 + 2] *= 0.965;

        // Gravitational downward drift
        this._burstVelocities[i * 3 + 1] -= 0.00065;
      }
      burstPos.needsUpdate = true;

      // Fade out based on age
      this.burstParticles.material.opacity = Math.max(0, 1 - this._burstLife * 0.55);
    }

    // Wax seal candle glowing/breathing
    if (!this.isOpened && this.sealMaterial) {
      this.sealMaterial.emissiveIntensity = 0.15 + Math.sin(time * 3.5) * 0.08;
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
