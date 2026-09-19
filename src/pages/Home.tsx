import { useNavigate } from 'react-router-dom';
import { useChartStore } from '../store/chartStore';
import { drawChartToCanvas } from '../utils/canvas';
import { useEffect, useRef, useState } from 'react';
import type { Chart } from '../types';

function ChartThumbnail({ chart }: { chart: Chart }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawChartToCanvas(chart, canvas, { showGrid: false, cellSize: 4 });
  }, [chart]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 120, objectFit: 'contain', background: '#faf8f5', borderRadius: 4, border: '1px solid #e0dcd5' }}
    />
  );
}

export default function Home() {
  const charts = useChartStore((s) => s.charts);
  const createChart = useChartStore((s) => s.createChart);
  const deleteChart = useChartStore((s) => s.deleteChart);
  const duplicateChart = useChartStore((s) => s.duplicateChart);
  const navigate = useNavigate();
  const [newCols, setNewCols] = useState(64);
  const [newRows, setNewRows] = useState(64);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>我的图解</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input type="number" value={newCols} onChange={(e) => setNewCols(Number(e.target.value))} style={{ width: 70, padding: '6px 8px' }} placeholder="宽" />
        <span>×</span>
        <input type="number" value={newRows} onChange={(e) => setNewRows(Number(e.target.value))} style={{ width: 70, padding: '6px 8px' }} placeholder="高" />
        <button
          onClick={() => {
            const id = createChart(newCols, newRows);
            navigate(`/editor/${id}`);
          }}
          style={{ padding: '8px 16px', borderRadius: 4, border: '1px solid #3498db', background: '#3498db', color: '#fff', cursor: 'pointer' }}
        >
          新建图解
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {charts.map((chart) => (
          <div key={chart.id} style={{ border: '1px solid #e0dcd5', borderRadius: 8, padding: 12, background: '#fff' }}>
            <div onClick={() => navigate(`/editor/${chart.id}`)} style={{ cursor: 'pointer' }}>
              <ChartThumbnail chart={chart} />
              <div style={{ marginTop: 8, fontWeight: 500, fontSize: 14 }}>{chart.title}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{chart.cols}×{chart.rows}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => navigate(`/editor/${chart.id}`)} style={{ flex: 1, fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #3498db', background: '#fff', color: '#3498db', cursor: 'pointer' }}>
                编辑
              </button>
              <button onClick={() => duplicateChart(chart.id)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #bdc3c7', background: '#fff', cursor: 'pointer' }}>
                复制
              </button>
              <button onClick={() => deleteChart(chart.id)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', cursor: 'pointer' }}>
                删除
              </button>
            </div>
          </div>
        ))}
        {charts.length === 0 && (
          <div style={{ color: '#888', fontSize: 14, gridColumn: '1 / -1', textAlign: 'center', padding: 40 }}>
            暂无图解，点击上方「新建图解」开始创建
          </div>
        )}
      </div>
    </div>
  );
}
