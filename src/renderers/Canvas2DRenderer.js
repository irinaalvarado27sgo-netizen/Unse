// src/renderers/Canvas2DRenderer.js

import { LIVE_SOURCES } from '../config/defaults.js';

const SIZE = 360;
const FRAME_INTERVAL_MS = 65;
const SCREEN_PHYSICAL_CM = 14;

export class Canvas2DRenderer {
  /**
   * @param {object} deps
   * @param {import('../state/AppStore.js').AppStore} deps.store
   * @param {import('./SourceSceneDrawer.js').SourceSceneDrawer} deps.sourceDrawer
   * @param {HTMLVideoElement} deps.videoEl
   * @param {HTMLCanvasElement[]} deps.monitorsScreen   
   * @param {HTMLCanvasElement[]} deps.monitorsSource   
   */
  constructor({ store, sourceDrawer, videoEl, monitorsScreen, monitorsSource }) {
    this.store = store;
    this.sourceDrawer = sourceDrawer;
    this.videoEl = videoEl;
    this.monitorsScreen = monitorsScreen;
    this.monitorsSource = monitorsSource;

    this.sourceCanvas = this._makeCanvas();
    this.screenCanvas = this._makeCanvas();
    this._srcCtx = this.sourceCanvas.getContext('2d');
    this._scrCtx = this.screenCanvas.getContext('2d');

    this.uploadedImage = null;
    this._timer = 0;
    this._looping = false;
    this._frameListeners = new Set();
  }

  _makeCanvas() {
    const c = document.createElement('canvas');
    c.width = SIZE;
    c.height = SIZE;
    return c;
  }

  onFrame(listener) {
    this._frameListeners.add(listener);
    return () => this._frameListeners.delete(listener);
  }

  setUploadedImage(img) {
    this.uploadedImage = img;
  }

  sync(state, prev) {
    const relevant = !prev
      || state.params !== prev.params
      || state.sourceId !== prev.sourceId
      || state.webcamStatus !== prev.webcamStatus
      || state.showRulerOverlay !== prev.showRulerOverlay
      || state.activeTab !== prev.activeTab
      || state.zenMode !== prev.zenMode
      || state.showSideBySide !== prev.showSideBySide;
    if (!relevant) return;

    if (this._isLive(state)) {
      this._startLoop();
    } else {
      this._stopLoop();
      this.renderOnce();
    }
  }

  renderOnce() {
    const state = this.store.getState();
    const t = performance.now() / 1000;
    this.sourceDrawer.draw(this._srcCtx, SIZE, SIZE, t, {
      sourceId: state.sourceId,
      ambientLightPct: state.params.ambientLightPct,
      webcamStatus: state.webcamStatus,
      video: this.videoEl,
      image: this.uploadedImage,
    });
    this._renderProjectedScreen(state);
    this._blit(this.monitorsScreen, this.screenCanvas);
    this._blit(this.monitorsSource, this.sourceCanvas);
    for (const fn of this._frameListeners) fn();
  }

  _isLive(state) {
    return LIVE_SOURCES.includes(state.sourceId);
  }

  _startLoop() {
    if (this._looping) return;
    this._looping = true;
    const tick = () => {
      if (!this._looping) return;
      this.renderOnce();
      if (!this._isLive(this.store.getState())) {
        this._looping = false;
        return;
      }
      this._timer = setTimeout(() => requestAnimationFrame(tick), FRAME_INTERVAL_MS);
    };
    tick();
  }

  _stopLoop() {
    this._looping = false;
    clearTimeout(this._timer);
  }

  _blit(targets, src) {
    for (const dst of targets) {
      if (dst.offsetParent === null) continue;
      const ctx = dst.getContext('2d');
      ctx.clearRect(0, 0, dst.width, dst.height);
      ctx.drawImage(src, 0, 0, dst.width, dst.height);
    }
  }

  _renderProjectedScreen(state) {
    const { params: p, metrics: m } = state;
    const ctx = this._scrCtx;
    const w = SIZE, h = SIZE;

    ctx.save();
    const paperBase = Math.round(14 + m.internalVeil * 115);
    ctx.fillStyle = `rgb(${paperBase},${paperBase},${Math.min(255, paperBase + 3)})`;
    ctx.fillRect(0, 0, w, h);

    const frac = Math.min(2.4, Math.max(0.14, m.absImageHeightCm / SCREEN_PHYSICAL_CM));
    const drawH = h * frac;
    const drawW = drawH * (this.sourceCanvas.width / this.sourceCanvas.height);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(-1, -1);
    const brightnessPct = Math.round(m.screenBrightness * 100);
    const contrastPct = Math.max(25, Math.round(m.contrastPct * 1.05));
    if (m.regime === 'virtual-image') {
      ctx.filter = `blur(24px) brightness(${Math.min(130, brightnessPct)}%)`;
      ctx.globalAlpha = 0.45;
    } else {
      ctx.filter = `blur(${m.visualBlurPx.toFixed(1)}px) brightness(${brightnessPct}%) contrast(${contrastPct}%)`;
      ctx.globalAlpha = Math.min(1, 0.25 + m.screenBrightness * 0.72);
    }
    ctx.drawImage(this.sourceCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const vigStrength = Math.min(0.65, 6 / Math.max(6, p.projectionDistanceCm));
    const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.68);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(2,6,23,${vigStrength.toFixed(2)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (!p.hasBlackLiner) {
      const bounce = ctx.createLinearGradient(0, 0, w, h);
      bounce.addColorStop(0, 'rgba(196,164,124,0.22)');
      bounce.addColorStop(0.5, 'rgba(196,164,124,0.08)');
      bounce.addColorStop(1, 'rgba(196,164,124,0.22)');
      ctx.fillStyle = bounce;
      ctx.fillRect(0, 0, w, h);
    }

    // filtración de luz por uniones
    if (p.lightLeakPct > 2) {
      const alpha = (p.lightLeakPct / 100) * 0.48;
      const leak = ctx.createLinearGradient(0, 0, w * 0.45, h * 0.4);
      leak.addColorStop(0, `rgba(255,244,214,${alpha.toFixed(2)})`);
      leak.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.fillStyle = leak;
      ctx.fillRect(0, 0, w, h);
    }

    if (state.showRulerOverlay) this._drawRuler(ctx, w, h, m.absImageHeightCm);
    ctx.restore();
  }

  _drawRuler(ctx, w, h, absImageHeightCm) {
    ctx.strokeStyle = 'rgba(245,158,11,0.55)';
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.lineWidth = 1;
    ctx.font = '500 10px monospace';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.setLineDash([]);

    const rx = w - 24;
    ctx.beginPath(); ctx.moveTo(rx, 8); ctx.lineTo(rx, h - 8); ctx.stroke();
    const pxPerCm = h / SCREEN_PHYSICAL_CM;
    ctx.textAlign = 'right';
    for (let cm = -6; cm <= 6; cm += 2) {
      const y = h / 2 - cm * pxPerCm;
      ctx.beginPath(); ctx.moveTo(rx - 6, y); ctx.lineTo(rx + 4, y); ctx.stroke();
      ctx.fillText(`${cm > 0 ? '+' : ''}${cm}`, rx - 9, y + 3);
    }

    const half = Math.min(h / 2 - 4, (absImageHeightCm / 2) * pxPerCm);
    ctx.strokeStyle = 'rgba(34,211,238,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(18, h / 2 - half); ctx.lineTo(18, h / 2 + half);
    ctx.moveTo(13, h / 2 - half); ctx.lineTo(23, h / 2 - half);
    ctx.moveTo(13, h / 2 + half); ctx.lineTo(23, h / 2 + half);
    ctx.stroke();
  }
}
