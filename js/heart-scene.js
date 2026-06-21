/**
 * HeartScene — Cinematic 3D heart that pulses, glows, and dissolves into particles.
 * Scene 2: Represents love entering the body.
 *
 * Phases (scroll-driven via onProgress):
 *   t = 0.0–0.3  Heart forms from orbiting particles
 *   t = 0.3–0.7  Heart pulses and glows at peak beauty
 *   t = 0.7–1.0  Heart dissolves into energy flowing downward
 */
import * as THREE from 'three';
import gsap from 'gsap';
import heartVertexShader from './shaders/heart-vert.glsl';
import heartFragmentShader from './shaders/heart-frag.glsl';

/* ─── quality-tier particle counts ─── */
const QUALITY_MAP = {
  high: { particles: 400, segments: 64 },
  mid: { particles: 280, segments: 48 },
  low: { particles: 160, segments: 32 }
};

export class HeartScene {
  /**
   * @param {{ quality: 'high'|'mid'|'low' }} options
   */
  constructor(options = {}) {
    this.quality = options.quality || 'mid';
    this.cfg = QUALITY_MAP[this.quality] || QUALITY_MAP.mid;

    this.group = new THREE.Group();
    this.group.visible = false;

    /* runtime state */
    this.heartMesh = null;
    this.particleSystem = null;
    this.innerLight = null;
    this.uniforms = null;
    this._progress = 0;
    this._disposed = false;
  }

  /* ─────────────────── public API ─────────────────── */

  /**
   * Build all objects and add them to an existing scene.
   * @param {THREE.Scene} parentScene
   * @param {THREE.Camera} camera
   */
  build(parentScene, camera) {
    this.camera = camera;
    this._buildHeart();
    this._buildOrbitParticles();
    this._buildInnerLight();
    parentScene.add(this.group);
  }

  /**
   * Per-frame update.
   * @param {number} time   — elapsed seconds
   * @param {number} scroll — global scroll 0–1
   * @param {number} delta  — frame delta seconds
   */
  update(time, scroll, delta) {
    if (!this.group.visible || this._disposed) return;

    const u = this.uniforms;
    u.uTime.value = time;
    u.uProgress.value = this._progress;

    /* heartbeat: ~72 bpm ≈ 1.2 Hz */
    const beat = (time * 1.2) % 1.0;
    u.uPulse.value = beat;

    /* formation / dissolve driven by scene progress */
    const form = THREE.MathUtils.smoothstep(this._progress, 0.0, 0.3);
    const dissolve = THREE.MathUtils.smoothstep(this._progress, 0.7, 1.0);
    u.uFormProgress.value = form;
    u.uDissolve.value = dissolve;

    /* gentle breathing scale on top of heartbeat */
    const breathe = 1.0 + Math.sin(time * 1.2 * Math.PI * 2) * 0.025;
    const baseScale = 0.09; // fit the parametric heart into ~3.5 units
    this.heartMesh.scale.setScalar(baseScale * breathe);

    /* inner point-light pulsing */
    if (this.innerLight) {
      this.innerLight.intensity = 1.2 + Math.sin(beat * Math.PI * 2) * 0.8;
      this.innerLight.intensity *= (1.0 - dissolve);
    }

    /* orbit particles */
    this._updateParticles(time, form, dissolve);
  }

  /**
   * Set the scene-local progress (0-1) for scroll-driven transitions.
   * @param {number} t  0–1
   */
  onProgress(t) {
    this._progress = THREE.MathUtils.clamp(t, 0, 1);
  }

  /**
   * Show or hide the entire heart group.
   */
  setVisible(visible) {
    this.group.visible = visible;
  }

  /**
   * Dispose all GPU resources.
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    if (this.heartMesh) {
      this.heartMesh.geometry.dispose();
      this.heartMesh.material.dispose();
    }
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }
    if (this.innerLight) {
      this.innerLight.parent?.remove(this.innerLight);
    }
    this.group.parent?.remove(this.group);
  }

  /* ─────────────────── private builders ─────────────────── */

  /**
   * Procedural parametric heart surface.
   * x = sin(u)·(A cos v − B cos 2v − C cos 3v − D cos 4v)
   * y = cos(u)·(A cos v − B cos 2v − C cos 3v − D cos 4v)
   * z = E · sin(v)
   */
  _buildHeart() {
    const seg = this.cfg.segments;
    const A = 16, B = 5, C = 2, D = 1, E = 15.5;

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

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
        const rV = A * Math.cos(vE) - B * Math.cos(2 * vE) - C * Math.cos(3 * vE) - D * Math.cos(4 * vE);
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
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    /* shared uniforms */
    this.uniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uProgress: { value: 0 },
      uFormProgress: { value: 0 },
      uDissolve: { value: 0 },
      uBaseColor: { value: new THREE.Color(0xe8466c) },
      uGlowColor: { value: new THREE.Color(0xffd700) },
      uOpacity: { value: 1.0 }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: heartVertexShader,
      fragmentShader: heartFragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending
    });

    this.heartMesh = new THREE.Mesh(geometry, material);
    this.heartMesh.scale.setScalar(0.09); // ~3.5 units across
    this.group.add(this.heartMesh);
  }

  /**
   * Orbiting particle cloud — converges onto heart, disperses on dissolve.
   */
  _buildOrbitParticles() {
    const count = this.cfg.particles;
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const A = 16, B = 5, C = 2, D = 1, E = 15.5;
    const rose = new THREE.Color(0xe8466c);
    const gold = new THREE.Color(0xffd700);
    const violet = new THREE.Color(0xc084fc);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      seeds[i] = Math.random();

      /* target position: points on the heart surface (scaled) */
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const r = A * Math.cos(v) - B * Math.cos(2 * v) - C * Math.cos(3 * v) - D * Math.cos(4 * v);
      targets[idx] = Math.sin(u) * r * 0.09;
      targets[idx + 1] = Math.cos(u) * r * 0.09;
      targets[idx + 2] = E * Math.sin(v) * 0.09;

      /* initial position: scattered in a large 3D heart shape instead of a sphere */
      const tInit = Math.PI * (2 * Math.random() - 1);
      const hxInit = 16 * Math.pow(Math.sin(tInit), 3);
      const hyInit = 13 * Math.cos(tInit) - 5 * Math.cos(2 * tInit) - 2 * Math.cos(3 * tInit) - Math.cos(4 * tInit);
      const initScale = 0.2 + Math.random() * 0.15;
      positions[idx] = hxInit * initScale + (Math.random() - 0.5) * 1.5;
      positions[idx + 1] = hyInit * initScale + (Math.random() - 0.5) * 1.5;
      positions[idx + 2] = (Math.random() - 0.5) * 8.0;

      /* colour mix: rose / gold / violet */
      const pick = Math.random();
      let col;
      if (pick < 0.5) col = rose.clone().lerp(gold, Math.random() * 0.4);
      else if (pick < 0.8) col = gold.clone().lerp(rose, Math.random() * 0.3);
      else col = violet.clone().lerp(rose, Math.random() * 0.4);
      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      map: this._createGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(geo, mat);
    this._particleSeeds = seeds;
    this._particleTargets = targets;
    this.group.add(this.particleSystem);
  }

  /**
   * Point light inside the heart that pulses with the heartbeat.
   */
  _buildInnerLight() {
    this.innerLight = new THREE.PointLight(0xff6b8a, 1.5, 8);
    this.innerLight.position.set(0, 0, 0);
    this.group.add(this.innerLight);

    /* secondary warm fill */
    const warmFill = new THREE.PointLight(0xffd700, 0.4, 6);
    warmFill.position.set(0, 0.5, 0.5);
    this.group.add(warmFill);
  }

  /**
   * Procedural radial glow texture for beautiful soft particles.
   */
  _createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 107, 138, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  /* ─────────────────── private update ─────────────────── */

  _updateParticles(time, formProgress, dissolveProgress) {
    const posAttr = this.particleSystem.geometry.attributes.position;
    const pos = posAttr.array;
    const targets = this._particleTargets;
    const seeds = this._particleSeeds;
    const count = seeds.length;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const seed = seeds[i];

      /* orbit parameters */
      const orbitSpeed = 0.3 + seed * 0.5;
      const orbitRadius = 2.5 + seed * 2.0;
      const angle = time * orbitSpeed + seed * Math.PI * 2;
      const yOsc = Math.sin(time * 0.8 + seed * 6.28) * 1.0;

      /* scattered orbit position: flying in a parametric 3D heart path */
      const hxOrbit = 16 * Math.pow(Math.sin(angle), 3);
      const hyOrbit = 13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle);

      const orbitScale = 0.12 + seed * 0.08;
      const ox = hxOrbit * orbitScale;
      const oy = hyOrbit * orbitScale + yOsc;
      const oz = Math.sin(angle * 2.0 + seed * 6.28) * 2.0; // depth wave

      /* target on heart surface */
      const tx = targets[idx];
      const ty = targets[idx + 1];
      const tz = targets[idx + 2];

      if (dissolveProgress > 0.01) {
        /* dissolve: drift away and downward from heart surface */
        const driftAngle = time * 0.4 + seed * 6.28;
        const driftR = dissolveProgress * (2.0 + seed * 3.0);
        pos[idx] = tx + Math.cos(driftAngle) * driftR;
        pos[idx + 1] = ty - dissolveProgress * (1.5 + seed * 2.0);
        pos[idx + 2] = tz + Math.sin(driftAngle) * driftR;
      } else {
        /* converge from orbit to heart surface */
        pos[idx] = THREE.MathUtils.lerp(ox, tx, formProgress);
        pos[idx + 1] = THREE.MathUtils.lerp(oy, ty, formProgress);
        pos[idx + 2] = THREE.MathUtils.lerp(oz, tz, formProgress);
      }
    }

    posAttr.needsUpdate = true;

    /* fade particles during peak glow, brighten during form/dissolve edges */
    const peakAlpha = this._progress > 0.3 && this._progress < 0.7 ? 0.45 : 0.85;
    this.particleSystem.material.opacity += (peakAlpha - this.particleSystem.material.opacity) * 0.08;
  }
}
