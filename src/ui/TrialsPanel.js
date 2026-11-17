// src/ui/TrialsPanel.js
// Pestaña "Mediciones": registro cuantitativo (Sección 4.3) con cálculo de error en vivo.

import { TrialCalculator } from '../models/TrialCalculator.js';
import { CsvExporter } from '../services/CsvExporter.js';
import { byId, escapeHtml } from './dom.js';

const FIELDS = [
  ['doCm', 'dₒ (cm)'],
  ['diCm', 'dᵢ (cm)'],
  ['hoCm', 'hₒ (cm)'],
  ['hiAbsCm', '|hᵢ| (cm)'],
];

export class TrialsPanel {
  constructor({ store }) {
    this.store = store;
    this.list = byId('trialsList');
    this._structureKey = null;
    this._bind();
  }

  _bind() {
    const { store } = this;

    byId('addSimTrialBtn').addEventListener('click', () => {
      const { params, metrics } = store.getState();
      store.addTrial({
        doCm: params.objectDistanceCm.toFixed(1),
        diCm: params.projectionDistanceCm.toFixed(1),
        hoCm: params.objectHeightCm.toFixed(1),
        hiAbsCm: metrics.absImageHeightCm.toFixed(2),
        notes: `Simulación D=${params.apertureDiameterMm.toFixed(2)} mm`,
        source: 'virtual',
      });
    });
    byId('addBlankTrialBtn').addEventListener('click', () => {
      store.addTrial({ doCm: '', diCm: '', hoCm: '', hiAbsCm: '', source: 'manual' });
    });
    byId('exportCsvBtn').addEventListener('click', () => CsvExporter.download(store.getState().trials));

    this.list.addEventListener('input', (e) => {
      const input = e.target.closest('.trial-input');
      if (input) store.updateTrial(Number(input.dataset.id), input.dataset.field, input.value);
    });
    this.list.addEventListener('click', (e) => {
      const del = e.target.closest('.del-trial');
      if (del) store.removeTrial(Number(del.dataset.id));
    });
  }

  render(state, prev) {
    if (prev && state.trials === prev.trials) return;
    const { trials } = state;

    const key = trials.map((t) => `${t.id}:${t.source}`).join('|');
    if (key !== this._structureKey) {
      this._structureKey = key;
      this.list.innerHTML = trials.map((t) => this._cardHtml(t, trials.length)).join('');
      return;
    }
    for (const t of trials) {
      const footer = this.list.querySelector(`[data-trial-id="${t.id}"] .trial-footer`);
      if (footer) footer.innerHTML = this._footerHtml(t);
    }
  }

  _footerHtml(trial) {
    const res = TrialCalculator.evaluate(trial);
    if (!res.valid) return '<span class="dim-xs">Completa las 4 magnitudes para calcular m y % error.</span>';
    return `<span class="mono" style="color:#cbd5e1;">m_teo: ${res.mTheoretical.toFixed(3)} · m_exp: ${res.mExperimental.toFixed(3)}</span>
      <span class="mono ${res.percentError < 5 ? 'text-emerald' : 'text-amber'}" style="font-weight:600;">Error: ${res.percentError.toFixed(2)}%</span>`;
  }

  _cardHtml(t, count) {
    const badge = t.source === 'virtual'
      ? '<span class="text-amber">Ejemplo simulado</span>'
      : '<span class="text-cyan">Medición real del grupo</span>';
    const inputs = FIELDS.map(([field, label]) => `
      <label><span class="dim-xs">${label}</span>
        <input class="trial-input" data-id="${t.id}" data-field="${field}" value="${escapeHtml(t[field])}" placeholder="—" /></label>`).join('');

    return `
      <div class="trial-card" data-trial-id="${t.id}">
        <div class="row-between" style="font-size:12px;">
          <div><strong class="mono">Ensayo ${t.id}</strong> · ${badge}</div>
          ${count > 1 ? `<button type="button" class="btn-ghost text-rose del-trial" data-id="${t.id}">Eliminar</button>` : ''}
        </div>
        <div class="grid-4">${inputs}</div>
        <div class="row-between trial-footer" style="font-size:11px;padding-top:6px;border-top:1px solid var(--border);">${this._footerHtml(t)}</div>
      </div>`;
  }
}
