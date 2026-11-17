// src/ui/UIManager.js

import { SCENARIOS, SLIDER_BINDINGS } from '../config/defaults.js';
import { byId, setInputValue, setText } from './dom.js';

const PRESET_NAMES = ['cutaway', 'side', 'screen', 'object'];

/** Chips del dock 3D: id del botón, clave de estado, clase activa y etiquetas opcionales. */
const DOCK_CHIPS = [
  { id: 'btnCutaway', key: 'cutawayOpen', onCls: 'chip-amber', on: 'Vista corte', off: 'Caja cerrada' },
  { id: 'btnRays', key: 'showRays', onCls: 'chip-cyan' },
  { id: 'btnCones', key: 'showRayCones', onCls: 'chip-amber' },
  { id: 'btnTriangles', key: 'showSimilarTriangles', onCls: 'chip-emerald' },
  { id: 'btnPhotons', key: 'animatePhotons', onCls: 'chip-slate' },
];

export class UIManager {
  /**
   * @param {{ store: import('../state/AppStore.js').AppStore }} deps
   */
  constructor({ store }) {
    this.store = store;
    this._cacheDom();
    this._bindNavigation();
    this._bindDock();
    this._bindControls();
  }

  _cacheDom() {
    const ids = [
      'asidePanel', 'zenBtn', 'miniStrip', 'dockBar', 'dockToggleBtn',
      'hudRegime', 'hudDo', 'hudDi', 'hudD', 'hudM',
      'miniSharpness', 'miniBrightness', 'miniHi',
      'valAperture', 'optApVal', 'optimalApBtn', 'valDi', 'valFocal', 'lensControlBox', 'lensFocusInfo',
      'valDo', 'valHo', 'valAmbient', 'valLeak', 'valLambda', 'linerSwitch', 'diagTitle', 'diagText',
      'srcPreviewHo', 'scrPreviewHi',
      'gaugeSharpText', 'gaugeSharpBar', 'gaugeBrightText', 'gaugeBrightBar', 'gaugeContrastText', 'gaugeContrastBar',
      'calcMag', 'calcHi', 'calcCoords', 'calcBlur', 'calcBlurParts', 'calcOpt', 'calcCurD',
      'resetBtn',
    ];
    this.dom = Object.fromEntries(ids.map((id) => [id, byId(id)]));
    this.dom.sliders = SLIDER_BINDINGS.map(([id, key]) => ({ el: byId(id), key }));
    this.dom.tabButtons = [...document.querySelectorAll('[data-tab]')];
    this.dom.tabPanes = [...document.querySelectorAll('.tab-pane')];
    this.dom.modeButtons = [...document.querySelectorAll('[data-mode]')];
    this.dom.presetButtons = [...document.querySelectorAll('[data-preset]')];
    this.dom.chips = DOCK_CHIPS.map((c) => ({ ...c, el: byId(c.id) }));
  }

  _bindNavigation() {
    this.dom.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.store.setState({ activeTab: btn.dataset.tab, zenMode: false }));
    });
    byId('brandLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.store.setState({ activeTab: 'controls', zenMode: false });
    });
    this.dom.zenBtn.addEventListener('click', () => {
      this.store.setState({ zenMode: !this.store.getState().zenMode });
    });
  }

  _bindDock() {
    this.dom.dockToggleBtn.addEventListener('click', () => {
      this.store.setState({ dockCollapsed: !this.store.getState().dockCollapsed });
    });
    this.dom.presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        // Aun si el preset es el mismo, se vuelve a pedir el encuadre (viewRequestId cambia siempre).
        this.store.setState({
          viewPreset: btn.dataset.preset,
          viewRequestId: this.store.getState().viewRequestId + 1,
        });
      });
    });
    this.dom.chips.forEach(({ el, key }) => {
      el.addEventListener('click', () => this.store.setState({ [key]: !this.store.getState()[key] }));
    });
  }

  _bindControls() {
    const { store } = this;

    this.dom.sliders.forEach(({ el, key }) => {
      el.addEventListener('input', () => store.updateParams({ [key]: parseFloat(el.value) }));
    });
    this.dom.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => store.updateParams({ opticalMode: btn.dataset.mode }));
    });
    this.dom.linerSwitch.addEventListener('click', () => {
      store.updateParams({ hasBlackLiner: !store.getState().params.hasBlackLiner });
    });
    this.dom.optimalApBtn.addEventListener('click', () => {
      store.updateParams({ apertureDiameterMm: Number(store.getState().metrics.optimalApertureMm.toFixed(2)) });
    });
    this.dom.resetBtn.addEventListener('click', () => store.resetSimulation());

    document.querySelectorAll('[data-scenario]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { aperture, ...rest } = SCENARIOS[btn.dataset.scenario];
        const patch = { opticalMode: 'pinhole', ...rest };
        if (aperture === 'optimal') patch.apertureDiameterMm = Number(store.getState().metrics.optimalApertureMm.toFixed(2));
        store.updateParams(patch);
      });
    });
  }

  render(state, prev) {
    const first = !prev;
    const paramsChanged = first || state.params !== prev.params;
    const tabChanged = first || state.activeTab !== prev.activeTab || state.zenMode !== prev.zenMode;

    if (tabChanged) this._renderChrome(state);
    if (first || state.dockCollapsed !== prev.dockCollapsed || this._viewChanged(state, prev)) this._renderDock(state);

    if (paramsChanged) {
      this._renderHud(state);
      this._renderMini(state);
    }
    if (paramsChanged || tabChanged) this._renderActivePane(state);
  }

  _viewChanged(s, p) {
    return s.viewPreset !== p.viewPreset
      || DOCK_CHIPS.some(({ key }) => s[key] !== p[key]);
  }

  _renderChrome(state) {
    const { dom } = this;
    dom.asidePanel.classList.toggle('hidden', state.zenMode);
    setText(dom.zenBtn, state.zenMode ? 'Mostrar panel' : 'Modo Exposición 3D');
    dom.miniStrip.classList.toggle('hidden', state.activeTab !== 'controls');

    dom.tabButtons.forEach((el) => {
      const active = el.dataset.tab === state.activeTab;
      el.classList.toggle('active', active);
      if (el.getAttribute('role') === 'tab') el.setAttribute('aria-selected', String(active));
    });
    dom.tabPanes.forEach((pane) => pane.classList.toggle('active', pane.id === `pane-${state.activeTab}`));
  }

  _renderDock(state) {
    const { dom } = this;
    dom.dockBar.classList.toggle('hidden', state.dockCollapsed);
    setText(dom.dockToggleBtn, state.dockCollapsed ? 'Controles 3D' : 'Ocultar barra 3D');
    dom.presetButtons.forEach((b) => b.classList.toggle('preset-active', b.dataset.preset === state.viewPreset));
    dom.chips.forEach(({ el, key, onCls, on, off }) => {
      const active = state[key];
      el.className = `dock-btn ${active ? onCls : 'chip-off'}`;
      if (on) setText(el, active ? on : off);
    });
  }

  _renderHud({ params: p, metrics: m }) {
    const { dom } = this;
    setText(dom.hudRegime, m.regimeLabel);
    setText(dom.hudDo, `dₒ = ${p.objectDistanceCm} cm`);
    setText(dom.hudDi, `dᵢ = ${p.projectionDistanceCm} cm`);
    setText(dom.hudD, `D = ${p.apertureDiameterMm.toFixed(2)} mm`);
    setText(dom.hudM, `m = ${m.magnification.toFixed(2)}`);
  }

  _brightnessPct(m) {
    return Math.min(100, Math.round((m.screenBrightness / 1.45) * 100));
  }

  _renderMini({ metrics: m }) {
    setText(this.dom.miniSharpness, `${m.sharpnessPct}%`);
    setText(this.dom.miniBrightness, `${this._brightnessPct(m)}%`);
    setText(this.dom.miniHi, `${m.absImageHeightCm.toFixed(1)} cm`);
  }

  _renderActivePane(state) {
    switch (state.activeTab) {
      case 'controls': return this._renderControls(state);
      case 'screen': return this._renderGauges(state);
      case 'lab': return this._renderLab(state);
      default: return undefined;
    }
  }

  _renderControls({ params: p, metrics: m }) {
    const { dom } = this;
    setText(dom.valAperture, `${p.apertureDiameterMm.toFixed(2)} mm`);
    setText(dom.optApVal, m.optimalApertureMm.toFixed(2));
    dom.optimalApBtn.classList.toggle('hidden', p.opticalMode !== 'pinhole');
    setText(dom.valDi, `${p.projectionDistanceCm.toFixed(0)} cm`);
    setText(dom.valFocal, `${p.lensFocalLengthCm.toFixed(1)} cm`);
    dom.lensControlBox.classList.toggle('hidden', p.opticalMode !== 'lens');
    setText(dom.lensFocusInfo, m.lensFocusDistanceCm !== null
      ? `Foco conjugado s′ = ${m.lensFocusDistanceCm.toFixed(1)} cm (pantalla en ${p.projectionDistanceCm} cm)`
      : 'Objeto dentro del foco (dₒ ≤ f): no forma imagen real.');
    setText(dom.valDo, `${p.objectDistanceCm.toFixed(0)} cm`);
    setText(dom.valHo, `${p.objectHeightCm.toFixed(0)} cm`);
    setText(dom.valAmbient, `${p.ambientLightPct.toFixed(0)}%`);
    setText(dom.valLeak, `${p.lightLeakPct.toFixed(0)}%`);
    setText(dom.valLambda, `${p.wavelengthNm.toFixed(0)} nm`);

    dom.sliders.forEach(({ el, key }) => setInputValue(el, p[key]));

    setText(dom.linerSwitch, p.hasBlackLiner ? 'Activado' : 'Sin afiche');
    dom.linerSwitch.className = `btn-pill ${p.hasBlackLiner ? 'on-emerald' : 'on-rose'}`;
    setText(dom.diagTitle, `Diagnóstico: ${m.regimeLabel}`);
    setText(dom.diagText, m.physicalInterpretation);
    dom.modeButtons.forEach((b) => b.classList.toggle('active', b.dataset.mode === p.opticalMode));
  }

  _renderGauges({ params: p, metrics: m }) {
    const { dom } = this;
    const bright = this._brightnessPct(m);
    setText(dom.srcPreviewHo, `hₒ = ${p.objectHeightCm} cm`);
    setText(dom.scrPreviewHi, `|hᵢ| = ${m.absImageHeightCm.toFixed(1)} cm`);
    setText(dom.gaugeSharpText, `${m.sharpnessPct}% · b = ${m.totalBlurMm.toFixed(2)} mm`);
    dom.gaugeSharpBar.style.width = `${m.sharpnessPct}%`;
    setText(dom.gaugeBrightText, `${bright}% · f/${Math.round(m.fNumber)}`);
    dom.gaugeBrightBar.style.width = `${bright}%`;
    setText(dom.gaugeContrastText, `${m.contrastPct}%`);
    dom.gaugeContrastBar.style.width = `${m.contrastPct}%`;
  }

  _renderLab({ params: p, metrics: m }) {
    const { dom } = this;
    setText(dom.calcMag, `m = -${p.projectionDistanceCm}/${p.objectDistanceCm} = ${m.magnification.toFixed(3)}`);
    setText(dom.calcHi, `|hᵢ| = ${m.absImageHeightCm.toFixed(2)} cm`);
    setText(dom.calcCoords, `s = ${m.cartesianS} cm, s′ = +${m.cartesianSPrime} cm`);
    setText(dom.calcBlur, `${m.totalBlurMm.toFixed(2)} mm`);
    setText(dom.calcBlurParts, `Geom: ${m.geometricBlurMm.toFixed(2)} · Difr: ${m.diffractionBlurMm.toFixed(2)} mm`);
    setText(dom.calcOpt, `D_ópt ≈ ${m.optimalApertureMm.toFixed(2)} mm`);
    setText(dom.calcCurD, `Actual: D = ${p.apertureDiameterMm.toFixed(2)} mm`);
  }
}
