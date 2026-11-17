// src/services/CsvExporter.js
import { TrialCalculator } from '../models/TrialCalculator.js';

export class CsvExporter {
  static build(trials) {
    const header = 'Ensayo,Origen,d_o (cm),d_i (cm),h_o (cm),|h_i| (cm),m_teorico,m_experimental,Error (%)\n';
    const rows = trials.map((t) => {
      const r = TrialCalculator.evaluate(t);
      return [
        t.id,
        t.source === 'virtual' ? 'Simulacion ejemplo' : 'Medicion real',
        t.doCm || '-', t.diCm || '-', t.hoCm || '-', t.hiAbsCm || '-',
        r.valid ? r.mTheoretical.toFixed(3) : '-',
        r.valid ? r.mExperimental.toFixed(3) : '-',
        r.valid ? r.percentError.toFixed(2) : '-',
      ].join(',');
    });
    return header + rows.join('\n');
  }

  static download(trials, filename = 'ensayos_camara_oscura_UNSE.csv') {
    const blob = new Blob([CsvExporter.build(trials)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
