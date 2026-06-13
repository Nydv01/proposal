/**
 * ActiveTheory "Work" helix — open cylinder with twist shader + wire glow shell.
 */
import * as THREE from 'three';
import workVert from './shaders/work-helix-vert.glsl';
import workFrag from './shaders/work-helix-frag.glsl';

export class TwistedWorkHelix {
  constructor() {
    this.group = new THREE.Group();
    this.uniforms = {
      uTime: { value: 0 },
      uTwistAmount: { value: 2.6 },
      uScrollProgress: { value: 0 },
      uVisibility: { value: 0 },
      uColorA: { value: new THREE.Color(0x1a2838) },
      uColorB: { value: new THREE.Color(0x3ec1b0) }
    };
  }

  build(scene, height = 44, radius = 6.8) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 128, 64, true);

    const shellMat = new THREE.ShaderMaterial({
      vertexShader: workVert,
      fragmentShader: workFrag,
      uniforms: this.uniforms,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.shell = new THREE.Mesh(geo, shellMat);
    this.group.add(this.shell);

    const wireGeo = new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, height, 48, 24, true);
    this.wire = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({
      color: 0x3ec1b0,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.group.add(this.wire);

    const innerGeo = new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, height, 64, 32, true);
    this.inner = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({
      color: 0xff4a76,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    this.group.add(this.inner);

    scene.add(this.group);
    return this.group;
  }

  update(time, scrollProgress) {
    this.uniforms.uTime.value = time;
    this.uniforms.uScrollProgress.value = scrollProgress;
    const vis = smoothstep(0.05, 0.2, scrollProgress) * (1 - smoothstep(0.85, 0.96, scrollProgress));
    this.uniforms.uVisibility.value = vis;
    this.group.visible = vis > 0.01;
    if (this.wire) this.wire.material.opacity = 0.06 + vis * 0.14;
    if (this.inner) this.inner.material.opacity = 0.04 + vis * 0.1;
    this.group.rotation.y = time * 0.06 + scrollProgress * 1.6;
  }
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
