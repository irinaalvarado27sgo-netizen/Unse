// src/renderers/three/ApparatusView.js

import * as THREE from 'three';
import { AXIS_Y, BOX_D, BOX_H, CM_TO_UNIT } from './layout.js';

export class ApparatusView {
  /**
   * @param {THREE.Scene} scene
   * @param {{objTexture: THREE.Texture, maxAnisotropy: number}} deps
   */
  constructor(scene, { objTexture, scrTexture, maxAnisotropy }) {
    this.scene = scene;
    this._lastHoleR = -1;
    this._buildRail(maxAnisotropy);
    this._buildObject(objTexture);
    this._buildBox();
    this._buildAperture();
    this._buildScreen(scrTexture);
  }

  _buildRail(maxAnisotropy) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.92 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.35;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(38, 38, 0x1e293b, 0x131c31);
    grid.position.y = -0.33;
    this.scene.add(grid);

    const rulerC = document.createElement('canvas');
    rulerC.width = 1024; rulerC.height = 128;
    const rctx = rulerC.getContext('2d');
    rctx.fillStyle = '#1e293b'; rctx.fillRect(0, 0, 1024, 128);
    rctx.strokeStyle = '#cbd5e1'; rctx.fillStyle = '#e2e8f0';
    rctx.font = '600 18px monospace'; rctx.textAlign = 'center';
    for (let cm = 0; cm <= 300; cm += 5) {
      const x = (cm / 300) * 1024;
      const major = cm % 20 === 0;
      rctx.lineWidth = major ? 2.5 : 1.2;
      rctx.beginPath(); rctx.moveTo(x, 8); rctx.lineTo(x, major ? 42 : 22); rctx.stroke();
      if (major && cm > 10 && cm < 290) rctx.fillText(String(cm - 240), x, 68);
    }
    const ox = (240 / 300) * 1024;
    rctx.fillStyle = '#f59e0b'; rctx.fillRect(ox - 2, 8, 4, 112);
    rctx.fillText('ORIFICIO (0)', ox, 104);

    const rulerTex = new THREE.CanvasTexture(rulerC);
    rulerTex.colorSpace = THREE.SRGBColorSpace;
    rulerTex.anisotropy = maxAnisotropy;

    const railLen = 300 * CM_TO_UNIT;
    const railCenterX = -90 * CM_TO_UNIT;
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(railLen, 0.16, 0.56),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.78, roughness: 0.32 }),
    );
    rail.position.set(railCenterX, 0.08, 0);
    this.scene.add(rail);

    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(railLen, 0.44),
      new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.55 }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(railCenterX, 0.165, 0);
    this.scene.add(strip);

    const footGeo = new THREE.CylinderGeometry(0.18, 0.26, 0.35, 14);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    for (const lx of [-15, -9, -3, 3]) {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(lx, -0.175, 0);
      this.scene.add(foot);
    }
  }

  _buildObject(objTexture) {
    this.objectGroup = new THREE.Group();
    this.scene.add(this.objectGroup);

    const saddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.22, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.35 }),
    );
    saddle.position.y = 0.18;
    this.objectGroup.add(saddle);

    this.objPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 1.35, 14),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.22 }),
    );
    this.objectGroup.add(this.objPost);

    this.objFrameGroup = new THREE.Group();
    this.objFrameGroup.position.y = AXIS_Y;
    this.objectGroup.add(this.objFrameGroup);
    this.objFrameGroup.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x0f172a }),
    ));

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.94, 0.94),
      new THREE.MeshBasicMaterial({ map: objTexture }),
    );
    plane.rotation.y = Math.PI / 2;
    plane.position.x = 0.075;
    this.objFrameGroup.add(plane);

    this.objTopMarker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    this.objBotMarker = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    this.objectGroup.add(this.objTopMarker, this.objBotMarker);
  }

  _buildBox() {
    this.boxGroup = new THREE.Group();
    this.scene.add(this.boxGroup);

    const cardMat = new THREE.MeshStandardMaterial({ color: 0x9a7852, roughness: 0.88 });
    this.linerMat = new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.96 });
    this.tapeMat = new THREE.MeshStandardMaterial({ color: 0xd6c7a9, transparent: true, opacity: 0.92 });

    this.cradleBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.85), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65 }));
    this.cradleBase.position.y = 0.24;
    const pillarH = AXIS_Y - BOX_H / 2 - 0.35;
    this.boxPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, pillarH, 14), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 }));
    this.boxPillar.position.y = 0.35 + pillarH / 2;
    this.boxCradle = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.35), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    this.boxCradle.position.y = AXIS_Y - BOX_H / 2 - 0.06;
    this.boxGroup.add(this.cradleBase, this.boxPillar, this.boxCradle);

    const mk = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    this.walls = {
      bottomOuter: mk(1, 0.05, BOX_D, cardMat),
      bottomInner: mk(1, 0.02, BOX_D - 0.1, this.linerMat),
      topOuter: mk(1, 0.05, BOX_D, cardMat),
      topInner: mk(1, 0.02, BOX_D - 0.1, this.linerMat),
      backOuter: mk(0.05, BOX_H, BOX_D, cardMat),
      backInner: mk(0.02, BOX_H - 0.1, BOX_D - 0.1, this.linerMat),
      farOuter: mk(1, BOX_H, 0.05, cardMat),
      farInner: mk(1, BOX_H - 0.1, 0.02, this.linerMat),
      nearOuter: mk(1, BOX_H, 0.05, cardMat),
      nearInner: mk(1, BOX_H - 0.1, 0.02, this.linerMat),
    };
    this.tapeTop = mk(1, 0.06, 0.12, this.tapeMat);
    this.tapeBot = mk(1, 0.06, 0.12, this.tapeMat);

    this.leakMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7, transparent: true, opacity: 0, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.leakShaft = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.55), this.leakMat);
    this.leakShaft.rotation.x = 0.35;

    this.boxGroup.add(...Object.values(this.walls), this.tapeTop, this.tapeBot, this.leakShaft);
  }

  _buildAperture() {
    const cardMat = new THREE.MeshStandardMaterial({ color: 0x9a7852, roughness: 0.88 });
    const foilMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ea, metalness: 0.92, roughness: 0.22, side: THREE.DoubleSide });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0xe0f2fe, roughness: 0.08, transparent: true, opacity: 0.45 });

    this.frontFrame = new THREE.Group();
    this.frontFrame.position.set(0, AXIS_Y, 0);
    this.boxGroup.add(this.frontFrame);

    const wh = 0.43, ho = BOX_H / 2, dh = BOX_D / 2;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, ho - wh, BOX_D), cardMat); top.position.y = (ho + wh) / 2;
    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.05, ho - wh, BOX_D), cardMat); bot.position.y = -(ho + wh) / 2;
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.05, wh * 2, dh - wh), cardMat); left.position.z = -(dh + wh) / 2;
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.05, wh * 2, dh - wh), cardMat); right.position.z = (dh + wh) / 2;
    this.frontFrame.add(top, bot, left, right);

    this.foilMesh = new THREE.Mesh(new THREE.BufferGeometry(), foilMat);
    this.foilMesh.rotation.y = Math.PI / 2;
    this.foilMesh.position.x = -0.015;
    this.frontFrame.add(this.foilMesh);

    this.lensGroup = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.028, 12, 28), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.75 }));
    ring.rotation.y = Math.PI / 2;
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), lensMat);
    glass.scale.set(0.28, 1, 1);
    this.lensGroup.add(ring, glass);
    this.frontFrame.add(this.lensGroup);
  }

  _buildScreen(scrTexture) {
    this.screenGroup = new THREE.Group();
    this.boxGroup.add(this.screenGroup);
    this.screenGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.32, 1.48), new THREE.MeshStandardMaterial({ color: 0x334155 })));

    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 1.22), new THREE.MeshBasicMaterial({ map: scrTexture }));
    paper.rotation.y = -Math.PI / 2;
    paper.position.x = -0.025;
    this.screenGroup.add(paper);

    this.imgTopMarker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    this.imgBotMarker = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    this.screenGroup.add(this.imgTopMarker, this.imgBotMarker);
  }

  update(state, L) {
    const { params: p } = state;
    const w = this.walls;

    // Objeto
    this.objectGroup.position.set(L.objX, 0, 0);
    this.objFrameGroup.scale.set(1, L.objHU, L.objHU);
    this.objTopMarker.position.set(0.08, AXIS_Y + L.halfObjH, 0);
    this.objBotMarker.position.set(0.08, AXIS_Y - L.halfObjH, 0);
    const postH = Math.max(0.15, Math.max(0.32, AXIS_Y - L.halfObjH) - 0.25);
    this.objPost.scale.set(1, postH / 1.35, 1);
    this.objPost.position.y = 0.25 + postH / 2;

    // Caja
    const { boxLenU, boxCX } = L;
    this.cradleBase.position.x = boxCX;
    this.boxPillar.position.x = boxCX;
    this.boxCradle.position.x = boxCX;
    this.boxCradle.scale.set(Math.max(0.85, boxLenU * 0.55), 1, 1);

    const stretch = (mesh, len, x, y, z) => { mesh.scale.set(len, 1, 1); mesh.position.set(x, y, z); };
    stretch(w.bottomOuter, boxLenU, boxCX, AXIS_Y - BOX_H / 2, 0);
    stretch(w.bottomInner, boxLenU - 0.08, boxCX, AXIS_Y - BOX_H / 2 + 0.032, 0);
    stretch(w.topOuter, boxLenU, boxCX, AXIS_Y + BOX_H / 2, 0);
    stretch(w.topInner, boxLenU - 0.08, boxCX, AXIS_Y + BOX_H / 2 - 0.032, 0);
    w.backOuter.position.set(boxLenU, AXIS_Y, 0);
    w.backInner.position.set(boxLenU - 0.032, AXIS_Y, 0);
    stretch(w.farOuter, boxLenU, boxCX, AXIS_Y, -BOX_D / 2);
    stretch(w.farInner, boxLenU - 0.08, boxCX, AXIS_Y, -BOX_D / 2 + 0.032);
    stretch(w.nearOuter, boxLenU, boxCX, AXIS_Y, BOX_D / 2);
    stretch(w.nearInner, boxLenU - 0.08, boxCX, AXIS_Y, BOX_D / 2 - 0.032);

    const closed = !state.cutawayOpen;
    w.nearOuter.visible = closed; w.nearInner.visible = closed;
    w.topOuter.visible = closed; w.topInner.visible = closed;

    stretch(this.tapeTop, boxLenU * 0.96, boxCX, AXIS_Y + BOX_H / 2 + 0.02, -BOX_D / 2);
    stretch(this.tapeBot, boxLenU * 0.96, boxCX, AXIS_Y - BOX_H / 2 - 0.01, BOX_D / 2);
    this.tapeMat.opacity = Math.max(0.2, 0.95 - (p.lightLeakPct / 100) * 0.72);

    this.leakShaft.scale.set(boxLenU * 0.85, 1, 1);
    this.leakShaft.position.set(boxCX, AXIS_Y + 0.35, -BOX_D * 0.32);
    this.leakMat.opacity = (p.lightLeakPct / 100) * 0.24;
    this.leakShaft.visible = p.lightLeakPct > 4;

    this.linerMat.color.setHex(p.hasBlackLiner ? 0x101218 : 0xb49065);
    this.linerMat.roughness = p.hasBlackLiner ? 0.96 : 0.72;

    this._rebuildFoil(L.visApR);
    this.lensGroup.visible = p.opticalMode === 'lens';
    const ls = THREE.MathUtils.clamp(L.visApR / 0.22, 0.35, 1.15);
    this.lensGroup.scale.set(1, ls, ls);
    this.screenGroup.position.set(L.diU, AXIS_Y, 0);
    const clampedH = Math.min(0.58, L.halfImgH);
    this.imgTopMarker.position.set(-0.04, -clampedH, 0);
    this.imgBotMarker.position.set(-0.04, clampedH, 0);
  }

  _rebuildFoil(r) {
    if (Math.abs(r - this._lastHoleR) < 0.002) return;
    this._lastHoleR = r;
    const shape = new THREE.Shape();
    shape.moveTo(-0.45, -0.45); shape.lineTo(0.45, -0.45); shape.lineTo(0.45, 0.45); shape.lineTo(-0.45, 0.45); shape.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, Math.min(0.36, Math.max(0.012, r)), 0, Math.PI * 2, true);
    shape.holes.push(hole);
    this.foilMesh.geometry.dispose();
    this.foilMesh.geometry = new THREE.ShapeGeometry(shape, 24);
  }
}
