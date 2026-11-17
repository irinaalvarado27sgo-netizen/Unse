// src/renderers/three/layout.js

import * as THREE from 'three';

export const CM_TO_UNIT = 1 / 14;
export const BOX_H = 1.65;
export const BOX_D = 1.85;
export const AXIS_Y = 4.25;

export function computeLayout(params, metrics) {
  const objX = -Math.min(20, Math.max(1.2, params.objectDistanceCm * CM_TO_UNIT));
  const objHU = Math.max(0.6, params.objectHeightCm * CM_TO_UNIT);
  const diU = params.projectionDistanceCm * CM_TO_UNIT;
  const boxLenU = Math.max(diU + 0.35, 1.8);

  return {
    objX,
    objHU,
    halfObjH: objHU / 2,
    diU,
    boxLenU,
    boxCX: boxLenU / 2,
    halfImgH: (metrics.absImageHeightCm * CM_TO_UNIT) / 2,
    visApR: THREE.MathUtils.clamp(0.014 + (params.apertureDiameterMm / 25) * 0.24, 0.014, 0.26),
  };
}
