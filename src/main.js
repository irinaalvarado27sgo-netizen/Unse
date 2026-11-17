// src/main.js

import { OpticalPhysics } from './models/OpticalPhysics.js';
import { AppStore } from './state/AppStore.js';
import { WebcamService } from './services/WebcamService.js';
import { SourceSceneDrawer } from './renderers/SourceSceneDrawer.js';
import { Canvas2DRenderer } from './renderers/Canvas2DRenderer.js';
import { Scene3DRenderer } from './renderers/Scene3DRenderer.js';
import { UIManager } from './ui/UIManager.js';
import { SourcePanel } from './ui/SourcePanel.js';
import { TrialsPanel } from './ui/TrialsPanel.js';
import { TheoryRenderer } from './ui/TheoryRenderer.js';
import { byId } from './ui/dom.js';

const store = new AppStore({ computeMetrics: OpticalPhysics.computeMetrics });

const videoEl = byId('webcamVideo');
const webcam = new WebcamService(videoEl);

const canvas2D = new Canvas2DRenderer({
  store,
  sourceDrawer: new SourceSceneDrawer(),
  videoEl,
  monitorsScreen: [byId('miniScreenCanvas'), byId('previewScreenCanvas')],
  monitorsSource: [byId('previewSourceCanvas')],
});

const scene3D = new Scene3DRenderer({
  store,
  mountEl: byId('canvas3d'),
  sourceCanvas: canvas2D.sourceCanvas,
  screenCanvas: canvas2D.screenCanvas,
});
canvas2D.onFrame(() => scene3D.markTexturesDirty());

const ui = new UIManager({ store });
const sourcePanel = new SourcePanel({ store, webcam, canvas2D });
const trialsPanel = new TrialsPanel({ store });
const theory = new TheoryRenderer();

store.subscribe((state, prev) => {
  ui.render(state, prev);
  sourcePanel.render(state, prev);
  trialsPanel.render(state, prev);
  theory.render(state, prev);
  canvas2D.sync(state, prev);
  scene3D.sync(state, prev);
});

const initial = store.getState();
ui.render(initial, null);
sourcePanel.render(initial);
trialsPanel.render(initial, null);
theory.render(initial);
canvas2D.sync(initial, null);
scene3D.requestRender();

window.addEventListener('beforeunload', () => webcam.stop());
