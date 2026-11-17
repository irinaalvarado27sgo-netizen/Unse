// src/state/AppStore.js

import { DEFAULT_PARAMS, DEFAULT_VIEW_STATE } from '../config/defaults.js';

export class AppStore {
  /**
   * @param {{ computeMetrics: (params: object) => object }} deps
   */
  constructor({ computeMetrics }) {
    this._computeMetrics = computeMetrics;
    this._listeners = new Set();

    const params = { ...DEFAULT_PARAMS };
    this._state = Object.freeze({
      params,
      metrics: computeMetrics(params),
      ...DEFAULT_VIEW_STATE,
      viewRequestId: 0, 
      activeTab: 'controls',
      zenMode: false,
      dockCollapsed: false,
      sourceId: 'asymmetric-f',
      webcamStatus: 'idle',
      webcamMessage: '',
      showRulerOverlay: true,
      showSideBySide: true,
      trials: Object.freeze([
        { id: 1, doCm: '', diCm: '', hoCm: '', hiAbsCm: '', notes: 'Medición del grupo (regla)', source: 'manual' },
        { id: 2, doCm: '', diCm: '', hoCm: '', hiAbsCm: '', notes: '', source: 'manual' },
      ]),
    });
  }

  getState() {
    return this._state;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  setState(patch) {
    this._commit({ ...this._state, ...patch });
  }

  updateParams(patch) {
    const params = { ...this._state.params, ...patch };
    this._commit({ ...this._state, params, metrics: this._computeMetrics(params) });
  }

  resetSimulation() {
    const params = { ...DEFAULT_PARAMS };
    this._commit({
      ...this._state,
      ...DEFAULT_VIEW_STATE,
      viewRequestId: this._state.viewRequestId + 1,
      params,
      metrics: this._computeMetrics(params),
    });
  }
  
  addTrial(data) {
    const trials = this._state.trials;
    const id = trials.length ? Math.max(...trials.map((t) => t.id)) + 1 : 1;
    this.setState({ trials: Object.freeze([...trials, { notes: '', ...data, id }]) });
  }

  updateTrial(id, field, value) {
    this.setState({
      trials: Object.freeze(this._state.trials.map((t) => (t.id === id ? { ...t, [field]: value } : t))),
    });
  }

  removeTrial(id) {
    this.setState({ trials: Object.freeze(this._state.trials.filter((t) => t.id !== id)) });
  }

  _commit(next) {
    const prev = this._state;
    this._state = Object.freeze(next);
    for (const listener of [...this._listeners]) listener(this._state, prev);
  }
}
