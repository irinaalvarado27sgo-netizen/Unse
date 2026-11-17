// src/renderers/SourceSceneDrawer.js

export class SourceSceneDrawer {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} w
   * @param {number} h
   * @param {number} timeSec
   * @param {{sourceId:string, ambientLightPct:number, webcamStatus:string, video:HTMLVideoElement, image:HTMLImageElement|null}} opts
   */
  draw(ctx, w, h, timeSec, opts) {
    const { sourceId, ambientLightPct, webcamStatus, video, image } = opts;
    const lightFactor = 0.35 + (ambientLightPct / 100) * 0.65;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    if (sourceId === 'webcam' && webcamStatus === 'active' && video.readyState >= 2 && video.videoWidth > 0) {
      this._drawCover(ctx, video, video.videoWidth, video.videoHeight, w, h);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(10, 10, 92, 22);
      ctx.fillStyle = '#fbbf24';
      ctx.font = '600 11px monospace';
      ctx.fillText('ARRIBA ▲', 18, 25);
    } else if (sourceId === 'upload' && image && image.complete && image.naturalWidth > 0) {
      this._drawCover(ctx, image, image.naturalWidth, image.naturalHeight, w, h);
    } else if (sourceId === 'asymmetric-f') {
      this._drawAsymmetricF(ctx, w, h, lightFactor);
    } else if (sourceId === 'candle-arrow') {
      this._drawCandleArrow(ctx, w, h, timeSec, lightFactor);
    } else {
      this._drawCourtyard(ctx, w, h, timeSec, lightFactor, sourceId === 'webcam' && webcamStatus !== 'active');
    }

    ctx.restore();
  }

  _drawCover(ctx, el, sw, sh, w, h) {
    const scale = Math.max(w / sw, h / sh);
    ctx.drawImage(el, (w - sw * scale) / 2, (h - sh * scale) / 2, sw * scale, sh * scale);
  }

  _dim(ctx, w, h, lightFactor, k) {
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 1 - lightFactor) * k})`;
    ctx.fillRect(0, 0, w, h);
  }

  _drawAsymmetricF(ctx, w, h, lightFactor) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(148,163,184,0.14)';
    for (let i = 0; i <= w; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SUP (+y)', w / 2, 18);
    ctx.fillText('INF (-y)', w / 2, h - 10);
    ctx.textAlign = 'left'; ctx.fillText('IZQ', 10, h / 2);
    ctx.textAlign = 'right'; ctx.fillText('DER', w - 10, h / 2);

    const fH = h * 0.56, fW = fH * 0.58, sw = Math.max(12, w * 0.055);
    const leftX = w * 0.5 - fW * 0.45, topY = h * 0.5 - fH * 0.5;
    const grad = ctx.createLinearGradient(0, topY, 0, topY + fH);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#f8fafc');
    grad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = grad;
    ctx.fillRect(leftX, topY, sw, fH);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(leftX, topY, fW, sw);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(leftX, topY + fH * 0.44, fW * 0.72, sw * 0.85);
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(leftX + sw * 0.5, topY + fH - sw * 0.3, sw * 0.65, 0, Math.PI * 2);
    ctx.fill();

    this._dim(ctx, w, h, lightFactor, 0.6);
  }

  _drawCandleArrow(ctx, w, h, timeSec, lightFactor) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0c1220'); bg.addColorStop(1, '#182032');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5, topY = h * 0.16, botY = h * 0.84;
    const grad = ctx.createLinearGradient(0, topY, 0, botY);
    grad.addColorStop(0, '#fbbf24'); grad.addColorStop(0.55, '#f8fafc'); grad.addColorStop(1, '#22d3ee');
    ctx.strokeStyle = grad; ctx.lineWidth = Math.max(8, w * 0.03); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.14, botY); ctx.lineTo(cx - w * 0.14, topY + 18); ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.14, topY);
    ctx.lineTo(cx - w * 0.14 - 16, topY + 26);
    ctx.lineTo(cx - w * 0.14 + 16, topY + 26);
    ctx.closePath(); ctx.fill();

    const candleX = cx + w * 0.14, candleTop = h * 0.48;
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(candleX - 13, candleTop, 26, botY - candleTop);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(candleX - 1.5, candleTop - 10, 3, 10);
    const sway = Math.sin(timeSec * 4.5) * 3;
    const fg = ctx.createRadialGradient(candleX + sway, candleTop - 22, 2, candleX, candleTop - 20, 24);
    fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.35, '#fde047'); fg.addColorStop(0.75, '#f97316'); fg.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(candleX + sway * 0.5, candleTop - 22, 11, 22, 0, 0, Math.PI * 2); ctx.fill();

    this._dim(ctx, w, h, lightFactor, 0.55);
  }

  _drawCourtyard(ctx, w, h, timeSec, lightFactor, showBird) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
    sky.addColorStop(0, '#38bdf8'); sky.addColorStop(0.65, '#bae6fd'); sky.addColorStop(1, '#fef3c7');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h * 0.65);

    const sunX = w * 0.2, sunY = h * 0.22;
    const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 44);
    sg.addColorStop(0, '#fffbeb'); sg.addColorStop(0.4, '#fde047'); sg.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sunY, 44, 0, Math.PI * 2); ctx.fill();

    const gg = ctx.createLinearGradient(0, h * 0.65, 0, h);
    gg.addColorStop(0, '#64748b'); gg.addColorStop(1, '#334155');
    ctx.fillStyle = gg; ctx.fillRect(0, h * 0.65, w, h * 0.35);

    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(w * 0.62, h * 0.34, w * 0.3, h * 0.33);
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(w * 0.62, h * 0.31, w * 0.3, h * 0.04);
    ctx.fillStyle = '#334155';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(w * 0.65 + c * w * 0.085, h * 0.39 + r * h * 0.11, w * 0.055, h * 0.07);
      }
    }

    const sway = Math.sin(timeSec * 1.4) * 3;
    const tx = w * 0.42;
    ctx.fillStyle = '#451a03'; ctx.fillRect(tx - 8, h * 0.44, 16, h * 0.25);
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(tx + sway * 0.5, h * 0.36, 36, 0, Math.PI * 2);
    ctx.arc(tx - 24 + sway * 0.3, h * 0.41, 26, 0, Math.PI * 2);
    ctx.arc(tx + 25 + sway * 0.7, h * 0.41, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath(); ctx.arc(tx - 6 + sway * 0.6, h * 0.32, 24, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(30,41,59,0.55)'; ctx.lineWidth = 3;
    for (let gx = 16; gx < w; gx += 34) {
      ctx.beginPath(); ctx.moveTo(gx, h * 0.62); ctx.lineTo(gx, h * 0.76); ctx.stroke();
    }

    if (showBird) {
      const bx = ((timeSec * 45) % (w + 40)) - 20;
      const by = h * 0.22 + Math.sin(timeSec * 5) * 6;
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by);
      ctx.quadraticCurveTo(bx - 4, by - 6, bx, by);
      ctx.quadraticCurveTo(bx + 4, by - 6, bx + 8, by);
      ctx.stroke();
    }

    if (lightFactor < 0.9675) { // equivale a iluminación < 95 %
      ctx.fillStyle = `rgba(2,6,23,${(1 - lightFactor) * 0.75})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
