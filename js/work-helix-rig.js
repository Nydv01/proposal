/**
 * ActiveTheory Work helix — twisted cylinder with memory panels wrapped on the surface.
 * Scroll spins the helix; click flies the camera through the panel (in / out).
 */
import * as THREE from 'three';
import gsap from 'gsap';
import cardVertexShader from './shaders/cylinder-vert.glsl';
import cardFragmentShader from './shaders/cylinder-frag.glsl';
import workVert from './shaders/work-helix-vert.glsl';
import workFrag from './shaders/work-helix-frag.glsl';
import { preloadMemorySurfaces } from './video-texture-factory.js';

export class WorkHelixRig {
  constructor(galleryItems, quality = 'high') {
    this.items = galleryItems || [];
    this.quality = quality;

    this.TWIST_K = 0.58;
    this.TWIST_AMP = 2.45;
    this.RADIUS = 7.2;
    this.HEIGHT = 52;
    this.TURNS = 3.2;

    this.group = new THREE.Group();
    this.cardsGroup = new THREE.Group();
    this.group.add(this.cardsGroup);

    this.cardMeshes = [];
    this.memorySurfaces = [];
    this.helixRotation = 0;
    this.targetHelixRotation = 0;
    this.dragOffset = 0;
  }

  async build(scene) {
    this.memorySurfaces = await preloadMemorySurfaces(this.items);
    this.buildShell();
    await this.buildPanels();
    scene.add(this.group);
    return this.group;
  }

  buildShell() {
    const h = this.HEIGHT;
    const geo = new THREE.CylinderGeometry(this.RADIUS, this.RADIUS, h, 160, 80, true);

    this.shellUniforms = {
      uTime: { value: 0 },
      uTwistAmount: { value: this.TWIST_AMP },
      uScrollProgress: { value: 0 },
      uVisibility: { value: 1 },
      uColorA: { value: new THREE.Color(0x0a1018) },
      uColorB: { value: new THREE.Color(0x3ec1b0) }
    };

    this.shell = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: workVert,
        fragmentShader: workFrag,
        uniforms: this.shellUniforms,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    this.group.add(this.shell);

    const wireGeo = new THREE.CylinderGeometry(this.RADIUS * 1.015, this.RADIUS * 1.015, h, 72, 36, true);
    this.wireOuter = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({
      color: 0x3ec1b0,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.group.add(this.wireOuter);

    const innerGeo = new THREE.CylinderGeometry(this.RADIUS * 0.88, this.RADIUS * 0.88, h, 48, 24, true);
    this.wireInner = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({
      color: 0xff4a76,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.group.add(this.wireInner);

    const railCount = 36;
    const railGeo = new THREE.TorusGeometry(0.35, 0.04, 8, 32);
    for (let i = 0; i < railCount; i++) {
      const t = i / (railCount - 1);
      const tr = this.getSurfaceTransform(t);
      const ring = new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({
        color: 0xffd25a,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x332200,
        emissiveIntensity: 0.5
      }));
      ring.position.copy(tr.position);
      ring.quaternion.copy(tr.quaternion);
      ring.scale.setScalar(0.9);
      this.group.add(ring);
    }
  }

  getSurfaceTransform(t) {
    const y = (t - 0.5) * this.HEIGHT;
    const theta = t * Math.PI * 2 * this.TURNS;

    const x = this.RADIUS * Math.cos(theta) + Math.cos(y * this.TWIST_K) * this.TWIST_AMP;
    const z = this.RADIUS * Math.sin(theta) + Math.sin(y * this.TWIST_K) * this.TWIST_AMP;

    const position = new THREE.Vector3(x, y, z);

    const dTheta = (Math.PI * 2 * this.TURNS) / this.HEIGHT;
    const tangent = new THREE.Vector3(
      -this.RADIUS * Math.sin(theta) * dTheta - Math.sin(y * this.TWIST_K) * this.TWIST_K * this.TWIST_AMP * dTheta,
      1,
      this.RADIUS * Math.cos(theta) * dTheta + Math.cos(y * this.TWIST_K) * this.TWIST_K * this.TWIST_AMP * dTheta
    ).normalize();

    const normal = new THREE.Vector3(
      Math.cos(theta),
      0,
      Math.sin(theta)
    ).normalize();

    const quat = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    const up = tangent.clone();
    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    const fwd = new THREE.Vector3().crossVectors(right, up).normalize();
    m.makeBasis(right, up, fwd);
    quat.setFromRotationMatrix(m);

    return { position, normal, tangent, theta, y, t, quaternion: quat };
  }

  async buildPanels() {
    const count = this.items.length;
    const panelW = 3.6;
    const panelH = 4.4;
    const geo = new THREE.PlaneGeometry(panelW, panelH, 48, 48);

    const glowColors = [
      new THREE.Color(0x3ec1b0),
      new THREE.Color(0xff4a76),
      new THREE.Color(0xffd25a),
      new THREE.Color(0xff8ca3),
      new THREE.Color(0x3ec1b0),
      new THREE.Color(0xff4a76)
    ];

    this.items.forEach((item, i) => {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const tr = this.getSurfaceTransform(t);
      const pack = this.memorySurfaces[i];

      const uniforms = {
        uTexture: { value: pack?.texture },
        uHasTexture: { value: pack?.texture ? 1 : 0 },
        uIsVideo: { value: pack?.isVideo ? 1 : 0 },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uOpacity: { value: 1 },
        uBendAmount: { value: 0.35 },
        uGlowColor: { value: glowColors[i % glowColors.length] },
        uCylinderRadius: { value: this.RADIUS },
        uTwistK: { value: this.TWIST_K },
        uTwistAmp: { value: 0.15 }
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: cardVertexShader,
        fragmentShader: cardFragmentShader,
        uniforms,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: true
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(tr.position);
      mesh.quaternion.copy(tr.quaternion);
      mesh.translateZ(0.55);

      mesh.userData = {
        index: i,
        helixT: t,
        baseTheta: tr.theta,
        caption: item.caption,
        emoji: item.emoji || '💖',
        date: item.date || '',
        story: item.story || '',
        image: item.image || '',
        video: item.video || '',
        surfaceNormal: tr.normal.clone(),
        surfacePos: tr.position.clone()
      };

      this.cardsGroup.add(mesh);
      this.cardMeshes.push(mesh);
    });
  }

  update(time, scrollProgress, isZoomed) {
    if (!this.shell) return;
    const vis = this._smooth(scrollProgress, 0.55, 0.58) * (1 - this._smooth(scrollProgress, 0.70, 0.73));

    if (this.shellUniforms) {
      this.shellUniforms.uTime.value = time;
      this.shellUniforms.uScrollProgress.value = scrollProgress;
      this.shellUniforms.uVisibility.value = vis;
    }

    this.group.visible = vis > 0.005;

    this.memorySurfaces.forEach((p) => p.surface?.update(0.016));

    this.cardMeshes.forEach((m) => {
      m.material.uniforms.uTime.value = time;
      if (!isZoomed) {
        m.material.uniforms.uOpacity.value = vis;
      }
    });

    if (!isZoomed) {
      const galleryScroll = THREE.MathUtils.clamp(
        (scrollProgress - 0.58) / 0.12,
        0,
        1
      );
      this.targetHelixRotation = galleryScroll * Math.PI * 2.5 + this.dragOffset;
      this.helixRotation += (this.targetHelixRotation - this.helixRotation) * 0.06;
      this.cardsGroup.rotation.y = this.helixRotation;
      this.shell.rotation.y = this.helixRotation;
      this.wireOuter.rotation.y = this.helixRotation;
      this.wireInner.rotation.y = this.helixRotation;
      this.group.rotation.y = this.helixRotation * 0.08;
    }
  }

  getCameraPose(scrollProgress, mouse, isZoomed) {
    const t = THREE.MathUtils.clamp(0.05 + scrollProgress * 0.82, 0.02, 0.98);
    const tr = this.getSurfaceTransform(t);
    const outward = tr.normal.clone().multiplyScalar(16 + mouse.x * 2);
    const lift = tr.tangent.clone().multiplyScalar(mouse.y * 2.5);
    const intro = (1 - Math.min(1, scrollProgress / 0.12)) * 28;

    return {
      position: tr.position.clone().add(outward).add(lift).add(new THREE.Vector3(0, 0, intro)),
      lookAt: tr.position.clone(),
      helixT: t
    };
  }

  alignPanelToCamera(card) {
    const target = -card.userData.baseTheta - this.helixRotation;
    const current = this.cardsGroup.rotation.y;
    const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + diff;
  }

  getDiveCameraTarget(card) {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    card.getWorldPosition(worldPos);
    card.getWorldQuaternion(worldQuat);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize();
    return {
      position: worldPos.clone().add(normal.multiplyScalar(4.2)),
      lookAt: worldPos.clone()
    };
  }

  _smooth(x, e0, e1) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }
}
