// src/config/defaults.js

export const DEFAULT_PARAMS = Object.freeze({
  objectDistanceCm: 120,
  projectionDistanceCm: 22,
  objectHeightCm: 60,
  apertureDiameterMm: 0.85,
  wavelengthNm: 550,
  ambientLightPct: 80,
  hasBlackLiner: true,
  lightLeakPct: 8,
  opticalMode: 'pinhole',
  lensFocalLengthCm: 18,
});

export const DEFAULT_VIEW_STATE = Object.freeze({
  viewPreset: 'cutaway',
  cutawayOpen: true,
  showRays: true,
  showRayCones: true,
  showSimilarTriangles: false,
  animatePhotons: true,
});

export const SCENARIOS = Object.freeze({
  optimal: { aperture: 'optimal', ambientLightPct: 90, hasBlackLiner: true, lightLeakPct: 0 },
  wide: { apertureDiameterMm: 14.5, ambientLightPct: 80, hasBlackLiner: true, lightLeakPct: 5 },
  diffraction: { apertureDiameterMm: 0.16, ambientLightPct: 95, hasBlackLiner: true, lightLeakPct: 0 },
  unsealed: { apertureDiameterMm: 1.4, ambientLightPct: 75, hasBlackLiner: false, lightLeakPct: 72 },
});

export const SLIDER_BINDINGS = Object.freeze([
  ['sliderAperture', 'apertureDiameterMm'],
  ['sliderDi', 'projectionDistanceCm'],
  ['sliderFocal', 'lensFocalLengthCm'],
  ['sliderDo', 'objectDistanceCm'],
  ['sliderHo', 'objectHeightCm'],
  ['sliderAmbient', 'ambientLightPct'],
  ['sliderLeak', 'lightLeakPct'],
  ['sliderLambda', 'wavelengthNm'],
]);

export const LIVE_SOURCES = Object.freeze(['candle-arrow', 'courtyard', 'webcam']);
