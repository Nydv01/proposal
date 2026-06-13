/**
 * Instanced 3D dribble strands — hundreds of glowing tubes (AT edge drip).
 */
import * as THREE from 'three';

export class InstancedDribbleTubes {
  constructor(scene, maxInstances = 600) {
    this.scene = scene;
    this.max = maxInstances;
    this.dummy = new THREE.Object3D();
    this.positions = Array.from({ length: this.max }, () => new THREE.Vector3());
    this.velocities = Array.from({ length: this.max }, () => new THREE.Vector3());
    this.life = new Float32Array(this.max);
    this.maxLife = new Float32Array(this.max);
    this.edges = new Uint8Array(this.max);
    this.colors = Array.from({ length: this.max }, () => new THREE.Color());

    for (let i = 0; i < this.max; i++) {
      this.life[i] = 9999;
    }

    const geo = new THREE.CylinderGeometry(0.022, 0.065, 1, 6, 1, false);
    geo.rotateX(Math.PI / 2);

    this.mesh = new THREE.InstancedMesh(
      geo,
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true
      }),
      this.max
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.mouseNDC = new THREE.Vector2();
    this._tmp = new THREE.Vector3();
    this.spawnIndex = 0;
  }

  setMouseNDC(x, y) {
    this.mouseNDC.set(x, y);
  }

  spawn(camera, edge = 'top') {
    const i = this.spawnIndex % this.max;
    this.spawnIndex++;

    const palette = [0x3ec1b0, 0xff4a76, 0xff8ca3, 0xffd25a, 0xb388ff];
    this.colors[i].setHex(palette[(Math.random() * palette.length) | 0]);
    this.mesh.setColorAt(i, this.colors[i]);

    const xNdc = this.mouseNDC.x + (Math.random() - 0.5) * 0.25;
    const yNdc = edge === 'top' ? 1.06 : -1.06;
    this._tmp.set(xNdc, yNdc, 0.35).unproject(camera);
    const origin = this._tmp.clone();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    origin.add(dir.multiplyScalar(-1.8));

    this.positions[i].copy(origin);
    this.velocities[i].set(
      (Math.random() - 0.5) * 0.07,
      edge === 'top' ? -0.14 - Math.random() * 0.18 : 0.14 + Math.random() * 0.18,
      (Math.random() - 0.5) * 0.07
    );
    this.life[i] = 0;
    this.maxLife[i] = 40 + Math.random() * 70;
    this.edges[i] = edge === 'top' ? 0 : 1;
  }

  update(camera) {
    for (let n = 0; n < 6; n++) {
      this.spawn(camera, 'top');
      this.spawn(camera, 'bottom');
    }

    let matrixUpdate = false;
    let colorUpdate = false;

    for (let i = 0; i < this.max; i++) {
      if (this.life[i] >= this.maxLife[i]) {
        this.dummy.position.set(0, -9999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        matrixUpdate = true;
        continue;
      }

      this.life[i]++;
      this.positions[i].add(this.velocities[i]);
      this.velocities[i].y += this.edges[i] === 0 ? -0.005 : 0.005;

      const t = this.life[i] / this.maxLife[i];
      const scale = (1 - t) * (0.8 + t * 2.8);

      this.dummy.position.copy(this.positions[i]);
      this.dummy.scale.set(scale, scale * 2.8, scale);
      this.dummy.lookAt(this.positions[i].clone().add(this.velocities[i]));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const c = this.colors[i].clone().multiplyScalar(1 - t * 0.75);
      this.mesh.setColorAt(i, c);

      matrixUpdate = true;
      colorUpdate = true;
    }

    if (matrixUpdate) this.mesh.instanceMatrix.needsUpdate = true;
    if (colorUpdate && this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
