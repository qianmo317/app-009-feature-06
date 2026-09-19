import { useChartStore } from '../store/chartStore';

export default function CanvasInfo() {
  const chart = useChartStore((s) => s.getCurrentChart());
  const scale = useChartStore((s) => s.scale);

  return (
    <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 12, color: '#888' }}>
      {chart ? `${chart.cols}×${chart.rows}  缩放: ${Math.round(scale * 100)}%` : '无图解'}
    </div>
  );
}
