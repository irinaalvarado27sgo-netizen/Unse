// src/renderers/three/RaysView.js

import * as THREE from 'three';
import { AXIS_Y, CM_TO_UNIT } from './layout.js';

const PHOTON_N = 16;

export class RaysView {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this._start = { top: new THREE.Vector3(), bot: new THREE.Vector3() };
    this._end = { top: new THREE.Vector3(), bot: new THREE.Vector3() };

    // Vectores reutilizables (evita basura por cuadro)
    this._v = new THREE.Vector3();
    this._quat = new THREE.Quaternion();
    this._scale = new THREE.Vector3();
    this._mat4 = new THREE.Matrix4();
    this._tmp = [0, 1, 2, 3, 4, 5].map(() => new THREE.Vector3());

    this._build(scene);
  }

  _buildAttr(count) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count), 3));
    return geo;
  }

  _build(scene) {
    this.topRaysGeo = this._buildAttr(18);
    this.group.add(new THREE.LineSegments(this.topRaysGeo, new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.92 })));
    this.botRaysGeo = this._buildAttr(18);
    this.group.add(new THREE.LineSegments(this.botRaysGeo, new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.92 })));

    this.axisGeo = this._buildAttr(6);
    this.axisLine = new THREE.Line(this.axisGeo, new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.65 }));
    this.group.add(this.axisLine);

    const coneMat = (color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    this.topConeGeo = this._buildAttr(36);
    this.topCone = new THREE.Mesh(this.topConeGeo, coneMat(0xf59e0b));
    this.botConeGeo = this._buildAttr(36);
    this.botCone = new THREE.Mesh(this.botConeGeo, coneMat(0x06b6d4));
    this.group.add(this.topCone, this.botCone);

    this.triGeo = this._buildAttr(18);
    this.triGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([
      0.96, 0.62, 0.04, 0.96, 0.62, 0.04, 0.96, 0.62, 0.04,
      0.02, 0.71, 0.83, 0.02, 0.71, 0.83, 0.02, 0.71, 0.83,
    ]), 3));
    this.triMesh = new THREE.Mesh(this.triGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    scene.add(this.triMesh);

    this.photons = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), PHOTON_N);
    this.photons.frustumCulled = false;
    for (let i = 0; i < PHOTON_N; i++) this.photons.setColorAt(i, new THREE.Color(i % 2 === 0 ? 0xfbbf24 : 0x22d3ee));
    this.photons.instanceColor.needsUpdate = true;
    this.group.add(this.photons);
  }

  _quad(arr, off, p1, p2, p3, p4) {
    const pts = [p1, p2, p3, p1, p3, p4];
    for (let i = 0; i < 6; i++) {
      arr[off + i * 3] = pts[i].x;
      arr[off + i * 3 + 1] = pts[i].y;
      arr[off + i * 3 + 2] = pts[i].z;
    }
  }

  _setRay(arr, sx, sy, ex, ey, upper, lower) {
    arr[0] = sx; arr[1] = sy; arr[2] = 0; arr[3] = ex; arr[4] = ey; arr[5] = 0;
    arr[6] = sx; arr[7] = sy; arr[8] = 0; arr[9] = ex; arr[10] = upper; arr[11] = 0;
    arr[12] = sx; arr[13] = sy; arr[14] = 0; arr[15] = ex; arr[16] = lower; arr[17] = 0;
  }

  update(state, L) {
    const { params: p, metrics: m, showRays, showRayCones, showSimilarTriangles, animatePhotons } = state;
    this.group.visible = showRays;

    const sx = L.objX + 0.08;
    const stY = AXIS_Y + L.halfObjH, sbY = AXIS_Y - L.halfObjH;
    const etY = AXIS_Y - L.halfImgH, ebY = AXIS_Y + L.halfImgH;
    const ex = L.diU - 0.03;

    this._start.top.set(sx, stY, 0); this._end.top.set(ex, etY, 0);
    this._start.bot.set(sx, sbY, 0); this._end.bot.set(ex, ebY, 0);

    let spotR = L.visApR * (1 + L.diU / Math.max(0.5, -sx));
    let flip = false;
    if (p.opticalMode === 'lens') {
      if (m.lensFocusDistanceCm !== null) {
        const fu = m.lensFocusDistanceCm * CM_TO_UNIT;
        spotR = L.visApR * (Math.abs(L.diU - fu) / Math.max(0.2, fu));
        flip = L.diU > fu; 
      } else {
        spotR = L.visApR * 1.6;
      }
    }
    const sgn = flip ? -1 : 1;
    const tUH = etY + sgn * spotR, tLH = etY - sgn * spotR;
    const bUH = ebY + sgn * spotR, bLH = ebY - sgn * spotR;

    this._setRay(this.topRaysGeo.attributes.position.array, sx, stY, ex, etY, tUH, tLH);
    this.topRaysGeo.attributes.position.needsUpdate = true;
    this._setRay(this.botRaysGeo.attributes.position.array, sx, sbY, ex, ebY, bUH, bLH);
    this.botRaysGeo.attributes.position.needsUpdate = true;

    const a = this.axisGeo.attributes.position.array;
    a[0] = sx - 0.4; a[1] = AXIS_Y; a[2] = 0; a[3] = L.diU + 0.35; a[4] = AXIS_Y; a[5] = 0;
    this.axisGeo.attributes.position.needsUpdate = true;
    this.axisLine.computeLineDistances();

    const showCones = showRays && showRayCones;
    this.topCone.visible = showCones;
    this.botCone.visible = showCones;
    if (showCones) {
      const [apT, apB, sT, sB, eTU, eTL] = this._tmp;
      apT.set(0, AXIS_Y + L.visApR, 0);
      apB.set(0, AXIS_Y - L.visApR, 0);

      sT.set(sx, stY, 0);
      eTU.set(ex, tUH, 0); eTL.set(ex, tLH, 0);
      this._quad(this.topConeGeo.attributes.position.array, 0, sT, apT, apB, sT);
      this._quad(this.topConeGeo.attributes.position.array, 18, apT, eTU, eTL, apB);
      this.topConeGeo.attributes.position.needsUpdate = true;

      sB.set(sx, sbY, 0);
      eTU.set(ex, bUH, 0); eTL.set(ex, bLH, 0);
      this._quad(this.botConeGeo.attributes.position.array, 0, sB, apT, apB, sB);
      this._quad(this.botConeGeo.attributes.position.array, 18, apT, eTU, eTL, apB);
      this.botConeGeo.attributes.position.needsUpdate = true;
    }

    this.triMesh.visible = showSimilarTriangles;
    if (showSimilarTriangles) {
      const t = this.triGeo.attributes.position.array;
      t.set([sx, stY, 0.01, sx, sbY, 0.01, 0, AXIS_Y, 0.01, 0, AXIS_Y, 0.01, ex, ebY, 0.01, ex, etY, 0.01]);
      this.triGeo.attributes.position.needsUpdate = true;
    }

    this.photons.visible = showRays && animatePhotons;
  }

  animate(elapsed) {
    if (!this.photons.visible) return;
    const half = PHOTON_N / 2;
    for (let i = 0; i < PHOTON_N; i++) {
      const top = i % 2 === 0;
      const t = (elapsed * 0.34 + Math.floor(i / 2) / half) % 1;
      this._v.lerpVectors(top ? this._start.top : this._start.bot, top ? this._end.top : this._end.bot, t);
      const s = 0.85 + Math.sin(t * Math.PI) * 0.35;
      this._scale.set(s, s, s);
      this._quat.identity();
      this._mat4.compose(this._v, this._quat, this._scale);
      this.photons.setMatrixAt(i, this._mat4);
    }
    this.photons.instanceMatrix.needsUpdate = true;
  }
}
