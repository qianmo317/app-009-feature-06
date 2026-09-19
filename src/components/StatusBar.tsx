import { useMemo } from 'react';
import { useChartStore } from '../store/chartStore';

export default function StatusBar() {
  const chart = useChartStore((s) => s.getCurrentChart());

  const stats = useMemo(() => {
    if (!chart) return [];
    const total = chart.cols * chart.rows;
    const counts = new Array(chart.palette.length).fill(0);
    for (let i = 0; i < chart.cells.length; i++) {
      const idx = chart.cells[i];
      if (idx < counts.length) counts[idx]++;
    }
    return chart.palette.map((p, i) => ({
      name: p.name,
      hex: p.hex,
      cells: counts[i],
      percentage: total > 0 ? Math.round((counts[i] / total) * 1000) / 10 : 0,
    }));
  }, [chart]);

  if (!chart) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '4px 12px',
        background: '#fff',
        borderBottom: '1px solid #e0dcd5',
        fontSize: 11,
        color: '#666',
        overflowX: 'auto',
      }}
    >
      <span>已用格数: {stats.reduce((a, s) => a + s.cells, 0)} / {chart.cols * chart.rows}</span>
      {stats.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 10, height: 10, background: s.hex, border: '1px solid #ddd', borderRadius: 2 }} />
          <span>{s.name}: {s.percentage}%</span>
        </div>
      ))}
    </div>
  );
}
