// src/ui/TheoryRenderer.js

import { byId, setText } from './dom.js';

const RAYLEIGH = { w: 340, h: 148, padL: 34, padR: 14, padT: 14, padB: 26, minD: 0.15, maxD: 18, maxBlur: 12 };

export class TheoryRenderer {
  constructor() {
    this.svgTriangles = byId('svgTriangles');
    this.svgRayleigh = byId('svgRayleigh');
    this.qualTable = byId('qualTable');
    this.optLabel = byId('theoryOptLabel');
    this._renderedFor = null;
  }

  render(state) {
    if (state.activeTab !== 'theory' || state.zenMode) return;
    if (this._renderedFor === state.params) return;
    this._renderedFor = state.params;

    this._renderTriangles(state);
    this._renderRayleigh(state);
    this._renderQualitative(state);
  }

  _renderTriangles({ params: p, metrics: m }) {
    const objHalf = Math.min(44, Math.max(16, (p.objectHeightCm / 120) * 44));
    const imgHalf = Math.min(46, Math.max(6, objHalf * Math.abs(m.magnification) * 1.4));
    const midY = 64, objX = 36, apX = 210, scrX = 304;

    this.svgTriangles.innerHTML = `
      <line x1="12" y1="${midY}" x2="328" y2="${midY}" stroke="#475569" stroke-dasharray="4 3" stroke-width="1" />
      <polygon points="${objX},${midY - objHalf} ${objX},${midY + objHalf} ${apX},${midY}" fill="rgba(245,158,11,0.14)" />
      <polygon points="${apX},${midY} ${scrX},${midY - imgHalf} ${scrX},${midY + imgHalf}" fill="rgba(6,182,212,0.14)" />
      <line x1="${objX}" y1="${midY - objHalf}" x2="${scrX}" y2="${midY + imgHalf}" stroke="#f59e0b" stroke-width="1.6" />
      <line x1="${objX}" y1="${midY + objHalf}" x2="${scrX}" y2="${midY - imgHalf}" stroke="#06b6d4" stroke-width="1.6" />
      <line x1="${objX}" y1="${midY - objHalf}" x2="${objX}" y2="${midY + objHalf}" stroke="#f8fafc" stroke-width="3" />
      <circle cx="${objX}" cy="${midY - objHalf}" r="3.5" fill="#f59e0b" />
      <circle cx="${objX}" cy="${midY + objHalf}" r="3.5" fill="#06b6d4" />
      <line x1="${apX}" y1="10" x2="${apX}" y2="${midY - 5}" stroke="#94a3b8" stroke-width="2.5" />
      <line x1="${apX}" y1="${midY + 5}" x2="${apX}" y2="118" stroke="#94a3b8" stroke-width="2.5" />
      <line x1="${scrX}" y1="14" x2="${scrX}" y2="114" stroke="#cbd5e1" stroke-width="2" />
      <line x1="${scrX}" y1="${midY - imgHalf}" x2="${scrX}" y2="${midY + imgHalf}" stroke="#e2e8f0" stroke-width="2.5" />
      <text x="${objX}" y="14" fill="#cbd5e1" font-size="9.5" text-anchor="middle" font-family="monospace">s = -${p.objectDistanceCm} cm</text>
      <text x="${(apX + scrX) / 2}" y="14" fill="#cbd5e1" font-size="9.5" text-anchor="middle" font-family="monospace">s′ = +${p.projectionDistanceCm} cm</text>
      <text x="${objX - 6}" y="${midY + 3}" fill="#f8fafc" font-size="9" text-anchor="end" font-family="monospace">hₒ</text>
      <text x="${scrX + 7}" y="${midY + 3}" fill="#22d3ee" font-size="9" text-anchor="start" font-family="monospace">hᵢ</text>`;
  }

  _renderRayleigh({ params: p, metrics: m }) {
    const { w, h, padL, padR, padT, padB, minD, maxD, maxBlur } = RAYLEIGH;
    const plotW = w - padL - padR, plotH = h - padT - padB;
    const logMin = Math.log10(minD), logSpan = Math.log10(maxD) - logMin;
    const mapX = (d) => padL + Math.max(0, Math.min(1, (Math.log10(d) - logMin) / logSpan)) * plotW;
    const mapY = (b) => padT + plotH - (Math.min(maxBlur, Math.max(0, b)) / maxBlur) * plotH;

    const diMm = p.projectionDistanceCm * 10;
    const lambdaMm = p.wavelengthNm * 1e-6;
    const geom = [], diff = [], total = [];
    for (let i = 0; i <= 40; i++) {
      const d = Math.pow(10, logMin + (i / 40) * logSpan);
      const bg = d * (1 + p.projectionDistanceCm / p.objectDistanceCm);
      const bd = (2.44 * lambdaMm * diMm) / d;
      const x = mapX(d).toFixed(1);
      geom.push(`${x},${mapY(bg).toFixed(1)}`);
      diff.push(`${x},${mapY(bd).toFixed(1)}`);
      total.push(`${x},${mapY(Math.hypot(bg, bd)).toFixed(1)}`);
    }

    const clampD = (d) => Math.min(maxD, Math.max(minD, d));
    const optX = mapX(clampD(m.optimalApertureMm));
    const curX = mapX(clampD(p.apertureDiameterMm));
    const curY = mapY(m.totalBlurMm);
    const pinhole = p.opticalMode === 'pinhole';

    this.svgRayleigh.innerHTML = `
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#334155" />
      <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#334155" />
      <line x1="${optX}" y1="${padT}" x2="${optX}" y2="${padT + plotH}" stroke="#10b981" stroke-dasharray="3 3" />
      ${pinhole ? `<polyline fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4 3" points="${geom.join(' ')}" />` : ''}
      <polyline fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="2 3" points="${diff.join(' ')}" />
      ${pinhole ? `<polyline fill="none" stroke="#f8fafc" stroke-width="2" points="${total.join(' ')}" />` : ''}
      <circle cx="${curX}" cy="${curY}" r="4.5" fill="#f59e0b" stroke="#090d16" stroke-width="1.5" />
      <text x="${padL + plotW / 2}" y="${h - 6}" fill="#94a3b8" font-size="9" text-anchor="middle" font-family="monospace">Diámetro D (mm) [0.15 — 18]</text>
      <text x="${padL - 5}" y="${padT + 8}" fill="#94a3b8" font-size="8.5" text-anchor="end" font-family="monospace">12mm</text>
      <text x="${padL - 5}" y="${padT + plotH}" fill="#94a3b8" font-size="8.5" text-anchor="end" font-family="monospace">0</text>`;
    setText(this.optLabel, `D_ópt ≈ ${m.optimalApertureMm.toFixed(2)} mm`);
  }

  _renderQualitative({ metrics: m }) {
    const brightDesc = m.screenBrightness < 0.32
      ? 'Tenue (orificio muy pequeño o baja luz)'
      : m.screenBrightness < 0.78
        ? 'Moderado (típico de cámara oscura)'
        : 'Alto (abertura amplia o gran luz)';
    const row = (label, value) =>
      `<div class="qual-row"><span style="color:var(--muted);">${label}</span><span style="text-align:right;">${value}</span></div>`;

    this.qualTable.innerHTML = [
      row('Formación', m.regime === 'virtual-image' ? 'Sin imagen real (dₒ ≤ f)' : 'Proyección real sobre pantalla'),
      row('Brillo', brightDesc),
      row('Contraste', m.contrastPct >= 80 ? 'Alto (afiche negro y caja sellada)' : 'Reducido por filtraciones/reflejos'),
      row('Nitidez', m.regimeLabel),
      row('Orientación', 'Invertida vertical y lateralmente'),
    ].join('');
  }
}
