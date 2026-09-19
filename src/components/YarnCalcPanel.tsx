import { useMemo } from 'react';
import { useChartStore } from '../store/chartStore';
import { calcYarnUsage } from '../utils/yarnCalc';

export default function YarnCalcPanel() {
  const chart = useChartStore((s) => s.getCurrentChart());
  const updateChart = useChartStore((s) => s.updateChart);
  const usage = useMemo(() => (chart ? calcYarnUsage(chart) : []), [chart]);

  if (!chart) return null;

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #e0dcd5' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>用线量计算</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          针数/10cm:
          <input
            type="number"
            value={chart.gauge.stsPer10cm}
            onChange={(e) => updateChart(chart.id, (c) => ({ ...c, gauge: { ...c.gauge, stsPer10cm: Number(e.target.value) } }))}
            style={{ width: 60, fontSize: 11, padding: '2px 4px' }}
          />
        </label>
        <label style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          行数/10cm:
          <input
            type="number"
            value={chart.gauge.rowsPer10cm}
            onChange={(e) => updateChart(chart.id, (c) => ({ ...c, gauge: { ...c.gauge, rowsPer10cm: Number(e.target.value) } }))}
            style={{ width: 60, fontSize: 11, padding: '2px 4px' }}
          />
        </label>
        <label style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          线团克重:
          <input
            type="number"
            value={chart.yarn.gramsPerSkein}
            onChange={(e) => updateChart(chart.id, (c) => ({ ...c, yarn: { ...c.yarn, gramsPerSkein: Number(e.target.value) } }))}
            style={{ width: 60, fontSize: 11, padding: '2px 4px' }}
          />
        </label>
        <label style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          线团米数:
          <input
            type="number"
            value={chart.yarn.metersPerSkein}
            onChange={(e) => updateChart(chart.id, (c) => ({ ...c, yarn: { ...c.yarn, metersPerSkein: Number(e.target.value) } }))}
            style={{ width: 60, fontSize: 11, padding: '2px 4px' }}
          />
        </label>
      </div>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e0dcd5' }}>
            <th style={{ textAlign: 'left', padding: '2px 4px' }}>颜色</th>
            <th style={{ textAlign: 'right', padding: '2px 4px' }}>米数</th>
            <th style={{ textAlign: 'right', padding: '2px 4px' }}>建议团数</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((u) => (
            <tr key={u.paletteId} style={{ borderBottom: '1px solid #f0eeea' }}>
              <td style={{ padding: '2px 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, background: u.hex, border: '1px solid #ddd' }} />
                {u.colorName}
              </td>
              <td style={{ textAlign: 'right', padding: '2px 4px' }}>{u.meters}m</td>
              <td style={{ textAlign: 'right', padding: '2px 4px' }}>{Math.ceil(u.skeins * 1.15 * 10) / 10}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
