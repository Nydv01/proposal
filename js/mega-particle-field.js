/**
 * 25k–40k GPU particles — AT-style ambient cloud + helix streams + edge dribble.
 */
import * as THREE from 'three';
import dripVert from './shaders/drip-vert.glsl';
import dripFrag from './shaders/drip-frag.glsl';

export class MegaParticleField {
  constructor(quality = 'high') {
    this.quality = quality;
    this.count = quality === 'high' ? 38000 : quality === 'medium' ? 18000 : 5000;
    this.uniforms = {
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
      uMousePos: { value: new THREE.Vector2(0, 0) },
      uMouseStrength: { value: 5.0 },
      uHelixRadius: { value: 7.2 },
      uHelixHeight: { value: 42 },
      uTurns: { value: 5.2 },
      uSceneIntro: { value: 1 }
    };
    this.points = null;
  }

  build(scene) {
    const seeds = new Float32Array(this.count);
    const dripSpeed = new Float32Array(this.count);
    const orbitPhase = new Float32Array(this.count);
    const layers = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);

    const teal = new THREE.Color(0x3ec1b0);
    const pink = new THREE.Color(0xff4a76);
    const rose = new THREE.Color(0xff8ca3);
    const gold = new THREE.Color(0xffd25a);
    const violet = new THREE.Color(0xb388ff);
    const white = new THREE.Color(0xf8f4ff);

    for (let i = 0; i < this.count; i++) {
      const r = Math.random();
      seeds[i] = Math.random();
      dripSpeed[i] = 0.15 + Math.random() * 0.85;
      orbitPhase[i] = Math.random();

      if (r < 0.35) layers[i] = 0;
      else if (r < 0.88) layers[i] = 1;
      else layers[i] = 2;

      let col;
      if (layers[i] < 0.5) col = teal.clone().lerp(violet, Math.random());
      else if (layers[i] < 1.5) col = pink.clone().lerp(rose, Math.random() * 0.5);
      else col = gold.clone().lerp(pink, Math.random());

      if (Math.random() > 0.7) col.lerp(white, 0.35);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('aRandomSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aDripSpeed', new THREE.BufferAttribute(dripSpeed, 1));
    geo.setAttribute('aOrbitPhase', new THREE.BufferAttribute(orbitPhase, 1));
    geo.setAttribute('aLayer', new THREE.BufferAttribute(layers, 1));
    geo.setAttribute('aCustomColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: dripVert,
      fragmentShader: dripFrag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    scene.add(this.points);
    return this.points;
  }

  update(time, scrollProgress, mouse) {
    this.uniforms.uTime.value = time;
    this.uniforms.uScrollProgress.value = scrollProgress;
    this.uniforms.uMousePos.value.copy(mouse);
    this.uniforms.uSceneIntro.value = scrollProgress < 0.12 ? 1 : 0;
  }
}
