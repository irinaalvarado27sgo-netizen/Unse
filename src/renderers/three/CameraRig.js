// src/renderers/three/CameraRig.js

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AXIS_Y } from './layout.js';

export class CameraRig {
  constructor(domElement, aspect, { damping = true } = {}) {
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 120);
    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = damping;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 42;
    this.controls.maxPolarAngle = Math.PI * 0.52;

    this.dirty = false;
    this.dragging = false;
    this._goalPos = new THREE.Vector3();
    this._goalTarget = new THREE.Vector3();

    this.controls.addEventListener('start', () => { this.dragging = true; this.dirty = false; });
    this.controls.addEventListener('end', () => { this.dragging = false; });
  }

  requestGoal() {
    if (!this.dragging) this.dirty = true;
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  snapTo(preset, layout) {
    this._computeGoal(preset, layout);
    this.camera.position.copy(this._goalPos);
    this.controls.target.copy(this._goalTarget);
    this.controls.update();
    this.dirty = false;
  }

  /** @returns {{transitioning:boolean, changed:boolean}} */
  update(dt, preset, layout) {
    let transitioning = false;
    if (this.dirty && !this.dragging) {
      this._computeGoal(preset, layout);
      const f = 1 - Math.exp(-6.5 * dt);
      this.camera.position.lerp(this._goalPos, f);
      this.controls.target.lerp(this._goalTarget, f);
      if (this.camera.position.distanceTo(this._goalPos) < 0.04 && this.controls.target.distanceTo(this._goalTarget) < 0.04) {
        this.camera.position.copy(this._goalPos);
        this.controls.target.copy(this._goalTarget);
        this.dirty = false;
      } else {
        transitioning = true;
      }
    }
    const changed = this.controls.update();
    return { transitioning, changed: !!changed };
  }

  _computeGoal(preset, { objX, diU, boxLenU }) {
    const cam = this.camera;
    const spanX = boxLenU - objX + 2.4;
    const midX = (objX + boxLenU) / 2;
    const hTan = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * Math.max(0.45, cam.aspect);
    const fitZ = THREE.MathUtils.clamp((spanX / 2) / hTan * 1.12, 8.5, 34);

    const set = (pos, target) => { this._goalPos.set(...pos); this._goalTarget.set(...target); };
    switch (preset) {
      case 'side': return set([midX, AXIS_Y + 0.25, fitZ], [midX, AXIS_Y - 0.35, 0]);
      case 'screen': return set([-1.35, AXIS_Y + 0.6, 2.75], [diU, AXIS_Y, 0]);
      case 'object': return set([objX + 4.2, AXIS_Y + 1.0, 4.8], [objX * 0.65, AXIS_Y, 0]);
      default: return set([midX - fitZ * 0.14, AXIS_Y + 2.5, fitZ * 0.96], [midX, AXIS_Y - 0.55, 0]);
    }
  }

  dispose() {
    this.controls.dispose();
  }
}
