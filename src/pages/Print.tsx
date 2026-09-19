import { useParams } from 'react-router-dom';
import { useMemo, useRef, useEffect } from 'react';
import { useChartStore } from '../store/chartStore';
import { drawChartToCanvas } from '../utils/canvas';
import { calcYarnUsage } from '../utils/yarnCalc';

const ROWS_PER_PAGE = 40;
const CELL_SIZE = 16;

export default function Print() {
  const { id } = useParams<{ id: string }>();
  const charts = useChartStore((s) => s.charts);
  const chart = charts.find((c) => c.id === id);
  const usage = useMemo(() => (chart ? calcYarnUsage(chart) : []), [chart]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  const pages = useMemo(() => {
    if (!chart) return [];
    const count = Math.ceil(chart.rows / ROWS_PER_PAGE);
    return Array.from({ length: count }, (_, i) => ({
      startRow: i * ROWS_PER_PAGE,
      endRow: Math.min((i + 1) * ROWS_PER_PAGE, chart.rows),
      pageNum: i + 1,
      totalPages: count,
    }));
  }, [chart]);

  useEffect(() => {
    if (!chart) return;
    pages.forEach((page, i) => {
      const canvas = canvasRefs.current[i];
      if (!canvas) return;
      drawChartToCanvas(chart, canvas, {
        showGrid: true,
        cellSize: CELL_SIZE,
        startRow: page.startRow,
        endRow: page.endRow,
      });
    });
  }, [chart, pages]);

  if (!chart) {
    return <div style={{ padding: 40, textAlign: 'center' }}>图解不存在</div>;
  }

  return (
    <div style={{ background: '#f5f3ef', minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>{chart.title}</h1>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
          {chart.cols}针 × {chart.rows}行 | 密度: {chart.gauge.stsPer10cm}针/{chart.gauge.rowsPer10cm}行 (10cm)
        </p>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>图例</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {usage.map((u) => (
              <div key={u.paletteId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 16, height: 16, background: u.hex, border: '1px solid #ddd' }} />
                <span>{u.colorName} ({u.cells}格, {u.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>用线量</h3>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e0dcd5' }}>
                <th style={{ textAlign: 'left', padding: '4px' }}>颜色</th>
                <th style={{ textAlign: 'right', padding: '4px' }}>米数</th>
                <th style={{ textAlign: 'right', padding: '4px' }}>建议团数(+15%)</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.paletteId} style={{ borderBottom: '1px solid #f0eeea' }}>
                  <td style={{ padding: '4px' }}>{u.colorName}</td>
                  <td style={{ textAlign: 'right', padding: '4px' }}>{u.meters}m</td>
                  <td style={{ textAlign: 'right', padding: '4px' }}>{Math.ceil(u.skeins * 1.15 * 10) / 10}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>图解分页</h3>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
            奇数行从左到右，偶数行从右到左（提花常规读法）
          </p>
          {pages.map((page, i) => (
            <div
              key={i}
              style={{
                marginBottom: 24,
                pageBreakInside: 'avoid',
                border: '1px solid #e0dcd5',
                padding: 12,
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                第 {page.pageNum}/{page.totalPages} 页 | 行 {page.startRow + 1} - {page.endRow}
              </div>
              <div style={{ overflow: 'auto' }}>
                <canvas
                  ref={(el) => { canvasRefs.current[i] = el; }}
                  style={{ display: 'block', maxWidth: '100%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
