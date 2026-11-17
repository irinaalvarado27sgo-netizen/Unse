// src/models/OpticalPhysics.js

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export class OpticalPhysics {
  static computeMetrics(params) {
    const doCm = Math.max(5, params.objectDistanceCm);
    const diCm = Math.max(4, params.projectionDistanceCm);
    const hoCm = Math.max(1, params.objectHeightCm);
    const apertureMm = Math.max(0.08, params.apertureDiameterMm);
    const wavelengthMm = clamp(params.wavelengthNm, 380, 750) * 1e-6;
    const diMm = diCm * 10;

    const cartesianS = -doCm;
    const cartesianSPrime = diCm;
    const magnification = cartesianSPrime / cartesianS;
    const imageHeightCm = magnification * hoCm;
    const absImageHeightCm = Math.abs(imageHeightCm);

    const optimalApertureMm = Math.sqrt((2.44 * wavelengthMm * diMm) / (1 + diCm / doCm));
    const diffractionBlurMm = (2.44 * wavelengthMm * diMm) / apertureMm;

    const optics = params.opticalMode === 'pinhole'
      ? OpticalPhysics._pinholeRegime({ apertureMm, diCm, doCm, optimalApertureMm })
      : OpticalPhysics._lensRegime({ apertureMm, diCm, doCm, focalCm: Math.max(2, params.lensFocalLengthCm) });

    const { geometricBlurMm, lensFocusDistanceCm, regime, regimeLabel, physicalInterpretation } = optics;

    const totalBlurMm = Math.hypot(geometricBlurMm, diffractionBlurMm);
    const visualBlurPx = clamp(totalBlurMm * 1.15, 0.2, 26);
    const fNumber = diMm / apertureMm;

    const referenceAreaRatio = Math.pow(1.4 / 220, 2);
    const currentAreaRatio = Math.pow(apertureMm / diMm, 2);
    const rawExposure = (currentAreaRatio / referenceAreaRatio) * (params.ambientLightPct / 80);
    const screenBrightness = clamp(Math.pow(rawExposure, 0.42) * 0.68, 0.05, 1.55);

    const sharpnessPct = Math.round(clamp(100 * Math.exp(-1.45 * (totalBlurMm / 12)), 4, 99));

    const linerReflection = params.hasBlackLiner ? 0.03 : 0.34;
    const leakContribution = (params.lightLeakPct / 100) * 0.55;
    const internalVeil = Math.min(0.85, linerReflection + leakContribution);
    const contrastPct = Math.round(clamp((1 - internalVeil) * 96, 8, 98));

    return {
      cartesianS, cartesianSPrime, magnification, imageHeightCm, absImageHeightCm,
      geometricBlurMm, diffractionBlurMm, totalBlurMm, visualBlurPx,
      optimalApertureMm, fNumber, screenBrightness, sharpnessPct, contrastPct, internalVeil,
      lensFocusDistanceCm, regime, regimeLabel, physicalInterpretation,
    };
  }

  static _pinholeRegime({ apertureMm, diCm, doCm, optimalApertureMm }) {
    const geometricBlurMm = apertureMm * (1 + diCm / doCm);
    let regime, regimeLabel, physicalInterpretation;

    if (apertureMm < optimalApertureMm * 0.6) {
      regime = 'diffraction';
      regimeLabel = 'Límite por difracción';
      physicalInterpretation =
        'Orificio extremadamente pequeño: ingresa muy poca luz y la difracción ondulatoria ensancha los bordes.';
    } else if (apertureMm <= optimalApertureMm * 3.0 && geometricBlurMm <= 2.4) {
      regime = 'optimal';
      regimeLabel = 'Equilibrio nitidez / brillo';
      physicalInterpretation =
        'Abertura cercana al óptimo geométrico: se minimiza la superposición de rayos manteniendo imagen real invertida legible.';
    } else {
      regime = 'geometric-blur';
      regimeLabel = 'Superposición geométrica (borrosa)';
      physicalInterpretation =
        'Abertura grande: rayos de un mismo punto llegan a una región extensa de la pantalla (círculo de confusión), aumentando el brillo pero reduciendo nitidez.';
    }
    return { geometricBlurMm, lensFocusDistanceCm: null, regime, regimeLabel, physicalInterpretation };
  }

  static _lensRegime({ apertureMm, diCm, doCm, focalCm }) {
    if (doCm <= focalCm + 0.5) {
      return {
        geometricBlurMm: apertureMm * 1.4,
        lensFocusDistanceCm: null,
        regime: 'virtual-image',
        regimeLabel: 'Sin foco real en pantalla',
        physicalInterpretation:
          'El objeto está dentro o sobre el foco de la lente (dₒ ≤ f): los rayos no convergen en la pantalla interna.',
      };
    }

    const lensFocusDistanceCm = (focalCm * doCm) / (doCm - focalCm);
    const defocusRatio = Math.abs(diCm - lensFocusDistanceCm) / lensFocusDistanceCm;
    const geometricBlurMm = apertureMm * defocusRatio;
    const focused = geometricBlurMm < 0.75;

    return {
      geometricBlurMm,
      lensFocusDistanceCm,
      regime: focused ? 'lens-focused' : 'lens-defocused',
      regimeLabel: focused ? 'Lente enfocada en pantalla' : 'Lente desenfocada (dᵢ ≠ s′)',
      physicalInterpretation: focused
        ? 'Con lente convergente (Sección 2.7), una abertura amplia concentra los rayos en un foco preciso s′ = dᵢ, logrando alto brillo y gran nitidez.'
        : 'La lente converge los rayos en s′ ≠ dᵢ: aquí la pantalla queda fuera del plano focal conjugado.',
    };
  }
}
