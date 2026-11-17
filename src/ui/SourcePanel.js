// src/ui/SourcePanel.js
// Pestaña "Cámara": selección de escena, cámara web, imagen propia, regla y comparación.

import { byId, setText } from './dom.js';

export class SourcePanel {
  /**
   * @param {object} deps
   * @param {import('../state/AppStore.js').AppStore} deps.store
   * @param {import('../services/WebcamService.js').WebcamService} deps.webcam
   * @param {import('../renderers/Canvas2DRenderer.js').Canvas2DRenderer} deps.canvas2D
   */
  constructor({ store, webcam, canvas2D }) {
    this.store = store;
    this.webcam = webcam;
    this.canvas2D = canvas2D;

    this.dom = {
      miniCamBtn: byId('miniCamBtn'),
      webcamToggleBtn: byId('webcamToggleBtn'),
      uploadTriggerBtn: byId('uploadTriggerBtn'),
      rulerToggleBtn: byId('rulerToggleBtn'),
      sideBySideBtn: byId('sideBySideBtn'),
      fileInput: byId('fileInput'),
      messageBox: byId('webcamMessageBox'),
      sourcePreviewWrap: byId('sourcePreviewWrap'),
      monitorsGrid: byId('monitorsGrid'),
      sourceButtons: [...document.querySelectorAll('[data-source]')],
    };
    this._bind();
  }

  _bind() {
    const { dom, store } = this;

    dom.sourceButtons.forEach((btn) => {
      btn.addEventListener('click', () => this._selectSource(btn.dataset.source));
    });
    dom.miniCamBtn.addEventListener('click', () => this._toggleWebcam());
    dom.webcamToggleBtn.addEventListener('click', () => this._toggleWebcam());
    dom.uploadTriggerBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', (e) => this._onFile(e));

    dom.rulerToggleBtn.addEventListener('click', () => {
      store.setState({ showRulerOverlay: !store.getState().showRulerOverlay });
    });
    dom.sideBySideBtn.addEventListener('click', () => {
      store.setState({ showSideBySide: !store.getState().showSideBySide });
    });
  }

  _selectSource(id) {
    const { store } = this;
    if (id === 'upload') { this.dom.fileInput.click(); return; }
    if (id === 'webcam') {
      if (store.getState().webcamStatus !== 'active') this._startWebcam();
      return;
    }
    this._stopWebcamIfActive();
    store.setState({ sourceId: id, webcamMessage: '' });
  }

  _toggleWebcam() {
    if (this.store.getState().webcamStatus === 'active') {
      this.webcam.stop();
      this.store.setState({ webcamStatus: 'idle', webcamMessage: '', sourceId: 'asymmetric-f' });
    } else {
      this._startWebcam();
    }
  }

  async _startWebcam() {
    const { store, webcam } = this;
    if (!webcam.isSupported) {
      store.setState({
        sourceId: 'webcam',
        webcamStatus: 'fallback',
        webcamMessage: 'Este entorno no expone cámara física: se activó la escena exterior animada simulada.',
      });
      return;
    }
    store.setState({
      sourceId: 'webcam',
      webcamStatus: 'requesting',
      webcamMessage: 'Solicitando acceso a la cámara del dispositivo...',
    });

    const status = await webcam.start();
    if (store.getState().sourceId !== 'webcam') {
      webcam.stop();
      return;
    }
    store.setState({
      webcamStatus: status,
      webcamMessage: status === 'active'
        ? 'Cámara en vivo conectada: proyectada invertida con desenfoque y brillo según tus barras.'
        : 'Sin permiso o cámara disponible: se activó el patio exterior animado como respaldo automático.',
    });
  }

  _stopWebcamIfActive() {
    const { webcamStatus } = this.store.getState();
    if (webcamStatus === 'active' || webcamStatus === 'requesting') {
      this.webcam.stop();
      this.store.setState({ webcamStatus: 'idle', webcamMessage: '' });
    }
  }

  _onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const url = URL.createObjectURL(file); 
    const img = new Image();
    img.onload = () => {
      this._stopWebcamIfActive();
      this.canvas2D.setUploadedImage(img);
      this.store.setState({ sourceId: 'upload', webcamMessage: '' });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  render(state) {
    const { dom } = this;
    const active = state.webcamStatus === 'active';

    setText(dom.miniCamBtn, active ? 'Cámara activa' : 'Usar cámara');
    dom.miniCamBtn.className = `btn-pill ${active ? 'on-emerald' : ''}`;
    setText(dom.webcamToggleBtn, active ? 'Detener cámara' : state.webcamStatus === 'requesting' ? 'Conectando...' : 'Usar cámara real');
    dom.webcamToggleBtn.className = `btn-pill ${active ? 'on-emerald' : ''}`;

    setText(dom.messageBox, state.webcamMessage);
    dom.messageBox.classList.toggle('hidden', !state.webcamMessage);

    dom.sourceButtons.forEach((b) => b.classList.toggle('active', b.dataset.source === state.sourceId));

    dom.rulerToggleBtn.className = `btn-pill ${state.showRulerOverlay ? 'on-amber' : ''}`;
    dom.sideBySideBtn.className = `btn-pill ${state.showSideBySide ? 'on-cyan' : ''}`;
    dom.sourcePreviewWrap.classList.toggle('hidden', !state.showSideBySide);
    dom.monitorsGrid.className = state.showSideBySide ? 'grid-2' : '';
  }
}
