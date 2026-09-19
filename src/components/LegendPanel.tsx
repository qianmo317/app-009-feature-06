import { useMemo } from 'react';
import { useChartStore } from '../store/chartStore';
import { calcYarnUsage } from '../utils/yarnCalc';

export default function LegendPanel() {
  const chart = useChartStore((s) => s.getCurrentChart());
  const usage = useMemo(() => (chart ? calcYarnUsage(chart) : []), [chart]);

  if (!chart) return null;

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #e0dcd5' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>图例与用量</h3>
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e0dcd5' }}>
            <th style={{ textAlign: 'left', padding: '2px 4px' }}>色</th>
            <th style={{ textAlign: 'left', padding: '2px 4px' }}>名称</th>
            <th style={{ textAlign: 'right', padding: '2px 4px' }}>格数</th>
            <th style={{ textAlign: 'right', padding: '2px 4px' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((u) => (
            <tr key={u.paletteId} style={{ borderBottom: '1px solid #f0eeea' }}>
              <td style={{ padding: '2px 4px' }}>
                <div style={{ width: 14, height: 14, background: u.hex, border: '1px solid #ddd', borderRadius: 2 }} />
              </td>
              <td style={{ padding: '2px 4px' }}>{u.colorName}</td>
              <td style={{ textAlign: 'right', padding: '2px 4px' }}>{u.cells}</td>
              <td style={{ textAlign: 'right', padding: '2px 4px' }}>{u.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
