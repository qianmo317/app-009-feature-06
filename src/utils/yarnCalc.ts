import type { Chart, YarnUsage } from '../types';

export function calcYarnUsage(chart: Chart): YarnUsage[] {
  const { cols, rows, palette, cells, gauge, yarn } = chart;
  const totalCells = cols * rows;
  if (totalCells === 0 || palette.length === 0) return [];

  const counts = new Array(palette.length).fill(0);
  for (let i = 0; i < cells.length; i++) {
    const idx = cells[i];
    if (idx < counts.length) counts[idx]++;
  }

  const stsPerMeter = gauge.stsPer10cm * 10;
  const rowsPerMeter = gauge.rowsPer10cm * 10;
  const singleStitchMeters = 1 / stsPerMeter + 1 / rowsPerMeter;
  const coefficient = singleStitchMeters * 1.5; // 1.5x for practical consumption

  return palette.map((p, i) => {
    const cellCount = counts[i];
    const percentage = totalCells > 0 ? (cellCount / totalCells) * 100 : 0;
    const meters = cellCount * coefficient;
    const skeins = yarn.metersPerSkein > 0 ? meters / yarn.metersPerSkein : 0;
    return {
      paletteId: p.id,
      colorName: p.name,
      hex: p.hex,
      cells: cellCount,
      percentage: Math.round(percentage * 10) / 10,
      meters: Math.round(meters * 10) / 10,
      skeins: Math.ceil(skeins * 10) / 10,
    };
  });
}
