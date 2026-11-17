// src/renderers/Scene3DRenderer.js

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ApparatusView } from './three/ApparatusView.js';
import { RaysView } from './three/RaysView.js';
import { CameraRig } from './three/CameraRig.js';
import { computeLayout } from './three/layout.js';

const BG = '#090d16';
const SOFTWARE_GL_TEXTURE_INTERVAL_MS = 180;

/** Detecta renderizado por software (SwiftShader/llvmpipe) para degradar calidad y ahorrar CPU. */
function detectSoftwareGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class Scene3DRenderer {
  /**
   * @param {object} deps
   * @param {import('../state/AppStore.js').AppStore} deps.store
   * @param {HTMLElement} deps.mountEl
   * @param {HTMLCanvasElement} deps.sourceCanvas 
   * @param {HTMLCanvasElement} deps.screenCanvas
   */
  constructor({ store, mountEl, sourceCanvas, screenCanvas }) {
    this.store = store;
    this.mountEl = mountEl;
    this.softwareGl = detectSoftwareGL();

    this.sceneDirty = true;
    this.textureDirty = true;
    this._busy = false;
    this._again = false;
    this._visible = true;
    this._texTimer = 0;
    this._lastTexSync = 0;
    this._lastTime = performance.now();
    this._elapsed = 0;

    this._initEngine();

    const state = store.getState();
    this.layout = computeLayout(state.params, state.metrics);

    this.objTexture = this._canvasTexture(sourceCanvas);
    this.scrTexture = this._canvasTexture(screenCanvas);

    this.apparatus = new ApparatusView(this.scene, {
      objTexture: this.objTexture,
      scrTexture: this.scrTexture,
      maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
    });
    this.rays = new RaysView(this.scene);

    this.rig.controls.addEventListener('change', () => this.requestRender());
    this._observe();

    this.rig.snapTo(state.viewPreset, this.layout);
  }

  _canvasTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _initEngine() {
    const w = this.mountEl.clientWidth || 800;
    const h = this.mountEl.clientHeight || 520;

    this.renderer = new THREE.WebGLRenderer({ antialias: !this.softwareGl, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.softwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.softwareGl;
    this.renderer.setSize(w, h);
    this.mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.scene.fog = new THREE.Fog(BG, 24, 58);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.rig = new CameraRig(this.renderer.domElement, w / h, { damping: !this.softwareGl });
    this.camera = this.rig.camera;

    this.scene.add(new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.85));
    const key = new THREE.DirectionalLight(0xfff1d6, 1.9);
    key.position.set(6, 10, 8);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rim.position.set(-10, 5, -7);
    this.scene.add(rim);
  }

  _observe() {
    this._resizeObserver = new ResizeObserver(() => {
      const w = this.mountEl.clientWidth || 800;
      const h = this.mountEl.clientHeight || 520;
      this.renderer.setSize(w, h);
      this.rig.resize(w, h);
      this.rig.requestGoal();
      this.requestRender();
    });
    this._resizeObserver.observe(this.mountEl);

    
    this._intersectionObserver = new IntersectionObserver(([entry]) => {
      this._visible = entry.isIntersecting;
      if (this._visible) this.requestRender();
    });
    this._intersectionObserver.observe(this.mountEl);
  }
  sync(state, prev) {
    const geometryChanged = state.params !== prev.params
      || state.cutawayOpen !== prev.cutawayOpen
      || state.showRays !== prev.showRays
      || state.showRayCones !== prev.showRayCones
      || state.showSimilarTriangles !== prev.showSimilarTriangles
      || state.animatePhotons !== prev.animatePhotons;
    const presetChanged = state.viewPreset !== prev.viewPreset || state.viewRequestId !== prev.viewRequestId;

    if (geometryChanged) this.sceneDirty = true;
    if (presetChanged) this.rig.requestGoal();
    if (geometryChanged || presetChanged) this.requestRender();
  }

  markTexturesDirty() {
    this.textureDirty = true;
    this.requestRender();
  }

  _syncGeometry(state) {
    this.layout = computeLayout(state.params, state.metrics);
    this.apparatus.update(state, this.layout);
    this.rays.update(state, this.layout);
    this.sceneDirty = false;
  }

  _uploadTextures(now) {
    if (this.softwareGl && now - this._lastTexSync < SOFTWARE_GL_TEXTURE_INTERVAL_MS) {
      if (!this._texTimer) {
        this._texTimer = setTimeout(() => { this._texTimer = 0; this.requestRender(); },
          SOFTWARE_GL_TEXTURE_INTERVAL_MS - (now - this._lastTexSync));
      }
      return;
    }
    this.objTexture.needsUpdate = true;
    this.scrTexture.needsUpdate = true;
    this.textureDirty = false;
    this._lastTexSync = now;
  }

  _afterDraw(cb) {
    const gl = this.renderer.getContext();
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (sync && gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.UNSIGNALED) {
        setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        setTimeout(cb, 80);
      }
    };
    setTimeout(poll, 5);
  }

  requestRender() {
    if (!this._visible) return;
    if (this._busy) { this._again = true; return; }
    this._busy = true;

    requestAnimationFrame((now) => {
      this._again = false;
      const dt = Math.min(0.1, (now - this._lastTime) / 1000);
      this._lastTime = now;
      this._elapsed += dt;

      const state = this.store.getState();
      if (this.sceneDirty) this._syncGeometry(state);
      if (this.textureDirty) this._uploadTextures(now);

      const { transitioning } = this.rig.update(dt, state.viewPreset, this.layout);

      const photonsActive = state.showRays && state.animatePhotons;
      if (photonsActive) this.rays.animate(this._elapsed);

      this.renderer.render(this.scene, this.camera);

      const keep = transitioning || photonsActive;
      const done = () => {
        this._busy = false;
        if (this._again || keep || this.sceneDirty || this.rig.dirty) this.requestRender();
      };
      if (this.softwareGl) this._afterDraw(done); else done();
    });
  }

  dispose() {
    this._resizeObserver?.disconnect();
    this._intersectionObserver?.disconnect();
    clearTimeout(this._texTimer);
    this.rig.dispose();
    this.scene.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose?.(); x.dispose(); });
    });
    this.scene.environment?.dispose?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
