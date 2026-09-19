import { useChartStore } from '../store/chartStore';
import type { Tool } from '../types';

const tools: { key: Tool; label: string; icon: string }[] = [
  { key: 'pencil', label: '铅笔', icon: '✏️' },
  { key: 'bucket', label: '油漆桶', icon: '🪣' },
  { key: 'line', label: '直线', icon: '📏' },
  { key: 'rect', label: '矩形', icon: '▭' },
  { key: 'mirror', label: '镜像', icon: '🔀' },
  { key: 'select', label: '选择', icon: '◰' },
];

export default function Toolbar() {
  const { tool, setTool, mirrorAxis, setMirrorAxis, scale, setScale, showGrid, setShowGrid } = useChartStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#fff', borderRight: '1px solid #e0dcd5', width: 56, alignItems: 'center' }}>
      {tools.map((t) => (
        <button
          key={t.key}
          title={t.label}
          onClick={() => setTool(t.key)}
          style={{
            width: 40,
            height: 40,
            border: tool === t.key ? '2px solid #3498db' : '1px solid #ddd',
            borderRadius: 6,
            background: tool === t.key ? '#eef6fc' : '#fff',
            cursor: 'pointer',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {t.icon}
        </button>
      ))}

      {tool === 'mirror' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
          <button
            onClick={() => setMirrorAxis('vertical')}
            style={{ fontSize: 10, padding: '2px 4px', border: mirrorAxis === 'vertical' ? '1px solid #3498db' : '1px solid #ddd', borderRadius: 4, background: mirrorAxis === 'vertical' ? '#eef6fc' : '#fff', cursor: 'pointer' }}
          >
            左右
          </button>
          <button
            onClick={() => setMirrorAxis('horizontal')}
            style={{ fontSize: 10, padding: '2px 4px', border: mirrorAxis === 'horizontal' ? '1px solid #3498db' : '1px solid #ddd', borderRadius: 4, background: mirrorAxis === 'horizontal' ? '#eef6fc' : '#fff', cursor: 'pointer' }}
          >
            上下
          </button>
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          title="缩小"
          onClick={() => setScale(scale * 0.9)}
          style={{ width: 32, height: 32, border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
        >
          −
        </button>
        <span style={{ fontSize: 10, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
        <button
          title="放大"
          onClick={() => setScale(scale * 1.1)}
          style={{ width: 32, height: 32, border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
        >
          +
        </button>
        <button
          title="网格"
          onClick={() => setShowGrid(!showGrid)}
          style={{ width: 32, height: 32, border: showGrid ? '1px solid #3498db' : '1px solid #ddd', borderRadius: 4, background: showGrid ? '#eef6fc' : '#fff', cursor: 'pointer', fontSize: 12 }}
        >
          #
        </button>
      </div>
    </div>
  );
}
