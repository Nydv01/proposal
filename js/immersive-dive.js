/**
 * Full-screen 3D immersive panel during memory dive (AT click-through).
 */
import * as THREE from 'three';
import gsap from 'gsap';

export class ImmersiveDive {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    const geo = new THREE.PlaneGeometry(14, 16, 1, 1);
    this.uniforms = {
      uTexture: { value: null },
      uHasTexture: { value: 0 },
      uIsVideo: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 0 }
    };

    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D uTexture;
          uniform float uHasTexture;
          uniform float uTime;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv;
            uv.x += sin(uv.y * 8.0 + uTime) * 0.002;
            vec4 col = uHasTexture > 0.5 ? texture2D(uTexture, uv) : vec4(0.08, 0.06, 0.12, 1.0);
            float vig = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
            vig *= smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
            col.rgb *= vig;
            gl_FragColor = vec4(col.rgb, col.a * uOpacity);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    this.group.add(this.mesh);

    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(14.4, 16.4),
      new THREE.MeshBasicMaterial({
        color: 0x3ec1b0,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    frame.position.z = -0.05;
    this.group.add(frame);
  }

  show(texture, isVideo = false) {
    this.uniforms.uTexture.value = texture;
    this.uniforms.uHasTexture.value = texture ? 1 : 0;
    this.uniforms.uIsVideo.value = isVideo ? 1 : 0;
    this.uniforms.uOpacity.value = 0;
    this.group.visible = true;

    this.group.position.copy(this.camera.position);
    this.group.quaternion.copy(this.camera.quaternion);
    this.mesh.position.z = -5.5;

    gsap.to(this.uniforms.uOpacity, { value: 1, duration: 0.9, ease: 'power2.out' });
    gsap.fromTo(this.mesh.scale, { x: 0.7, y: 0.7, z: 0.7 }, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'power3.out' });
  }

  hide() {
    return new Promise((resolve) => {
      gsap.to(this.uniforms.uOpacity, {
        value: 0,
        duration: 0.65,
        ease: 'power2.in',
        onComplete: () => {
          this.group.visible = false;
          resolve();
        }
      });
    });
  }

  followCamera() {
    if (!this.group.visible) return;
    this.group.position.copy(this.camera.position);
    this.group.quaternion.copy(this.camera.quaternion);
    this.uniforms.uTime.value = performance.now() * 0.001;
  }
}
