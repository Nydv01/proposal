/**
 * ActiveTheory-style 3D drip tubes from viewport top & bottom edges (WebGL).
 */
import * as THREE from 'three';

export class WebGLEdgeTubes {
  constructor(scene) {
    this.scene = scene;
    this.max = 220;
    this.pool = [];
    this.geo = new THREE.CylinderGeometry(0.03, 0.06, 1, 6, 1, false);
    this.materials = [
      new THREE.MeshBasicMaterial({ color: 0x3ec1b0, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: 0xff4a76, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: 0xff8ca3, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
    ];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mouseNDC = new THREE.Vector2();
    this._tmp = new THREE.Vector3();
  }

  setMouseNDC(x, y) {
    this.mouseNDC.set(x, y);
  }

  spawn(camera, edge = 'top') {
    if (this.pool.length >= this.max) return;

    const mat = this.materials[Math.floor(Math.random() * this.materials.length)];
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.rotation.x = Math.PI / 2;

    const xNdc = this.mouseNDC.x + (Math.random() - 0.5) * 0.15;
    const yNdc = edge === 'top' ? 1.02 : -1.02;
    this._tmp.set(xNdc, yNdc, 0.5).unproject(camera);
    const origin = this._tmp.clone();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    origin.add(dir.multiplyScalar(-2));

    mesh.position.copy(origin);
    mesh.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        edge === 'top' ? -0.06 - Math.random() * 0.08 : 0.06 + Math.random() * 0.08,
        (Math.random() - 0.5) * 0.04
      ),
      life: 0,
      maxLife: 50 + Math.random() * 40,
      scaleY: 0.4 + Math.random() * 1.2,
      edge
    };
    mesh.scale.set(1, mesh.userData.scaleY, 1);
    this.group.add(mesh);
    this.pool.push(mesh);
  }

  update(camera, delta) {
    if (Math.random() > 0.35) {
      this.spawn(camera, 'top');
      this.spawn(camera, 'bottom');
    }

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const m = this.pool[i];
      const d = m.userData;
      d.life++;
      m.position.add(d.velocity);
      d.velocity.y += d.edge === 'top' ? -0.002 : 0.002;
      m.material.opacity = 0.85 * (1 - d.life / d.maxLife);
      m.scale.y = d.scaleY * (1 + d.life * 0.02);

      if (d.life >= d.maxLife) {
        this.group.remove(m);
        this.pool.splice(i, 1);
      }
    }
  }
}
