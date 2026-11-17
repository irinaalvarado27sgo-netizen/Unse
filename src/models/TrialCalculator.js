// src/models/TrialCalculator.js

const parse = (v) => parseFloat(String(v ?? '').replace(',', '.'));

export class TrialCalculator {
  static evaluate(trial) {
    const values = [trial.doCm, trial.diCm, trial.hoCm, trial.hiAbsCm].map(parse);
    if (!values.every((n) => Number.isFinite(n) && n > 0)) {
      return { valid: false, mTheoretical: null, mExperimental: null, percentError: null };
    }
    const [doVal, diVal, hoVal, hiVal] = values;
    const mTheoretical = -diVal / doVal;
    const mExperimental = -hiVal / hoVal;
    const percentError = (Math.abs(Math.abs(mExperimental) - Math.abs(mTheoretical)) / Math.abs(mTheoretical)) * 100;
    return { valid: true, mTheoretical, mExperimental, percentError };
  }
}
