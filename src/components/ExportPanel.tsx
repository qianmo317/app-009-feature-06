import { useChartStore } from '../store/chartStore';
import { exportChartPNG } from '../utils/canvas';

export default function ExportPanel() {
  const chart = useChartStore((s) => s.getCurrentChart());
  const { setScale, setOffset } = useChartStore();

  const exportPNG = async () => {
    if (!chart) return;
    const blob = await exportChartPNG(chart, 8);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chart.title}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const goToPrint = () => {
    if (!chart) return;
    window.open(`#/print/${chart.id}`, '_blank');
  };

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>导出与视图</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button onClick={exportPNG} disabled={!chart} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, border: '1px solid #27ae60', background: '#27ae60', color: '#fff', cursor: 'pointer' }}>
          导出 PNG (8x)
        </button>
        <button onClick={goToPrint} disabled={!chart} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, border: '1px solid #8e44ad', background: '#8e44ad', color: '#fff', cursor: 'pointer' }}>
          打印视图
        </button>
        <button onClick={resetView} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, border: '1px solid #bdc3c7', background: '#ecf0f1', color: '#333', cursor: 'pointer' }}>
          重置视图
        </button>
      </div>
    </div>
  );
}
