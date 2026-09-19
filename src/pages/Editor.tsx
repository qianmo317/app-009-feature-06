import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useChartStore } from '../store/chartStore';
import CanvasGrid from '../components/CanvasGrid';
import CanvasInfo from '../components/CanvasInfo';
import Toolbar from '../components/Toolbar';
import RightPanel from '../components/RightPanel';
import StatusBar from '../components/StatusBar';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const charts = useChartStore((s) => s.charts);
  const setCurrentChart = useChartStore((s) => s.setCurrentChart);
  const updateChart = useChartStore((s) => s.updateChart);
  const undo = useChartStore((s) => s.undo);
  const redo = useChartStore((s) => s.redo);
  const canUndo = useChartStore((s) => s.historyIndex > 0);
  const canRedo = useChartStore((s) => s.historyIndex < s.history.length);
  const undoLabel = useChartStore((s) => (s.historyIndex > 0 ? s.history[s.historyIndex - 1].label : null));
  const redoLabel = useChartStore((s) => (s.historyIndex < s.history.length ? s.history[s.historyIndex].label : null));
  const chart = charts.find((c) => c.id === id);
  const [title, setTitle] = useState(chart?.title ?? '');

  useEffect(() => {
    if (id) setCurrentChart(id);
  }, [id, setCurrentChart]);

  useEffect(() => {
    if (chart) setTitle(chart.title);
  }, [chart?.title]);

  if (!chart) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>图解不存在</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '8px 16px' }}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e0dcd5', gap: 12 }}>
        <button onClick={() => navigate('/')} style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #bdc3c7', background: '#fff', cursor: 'pointer' }}>
          ← 返回
        </button>
        <button
          onClick={undo}
          disabled={!canUndo}
          title={undoLabel ? `撤销：${undoLabel} (Ctrl+Z)` : '撤销 (Ctrl+Z)'}
          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #bdc3c7', background: '#fff', cursor: canUndo ? 'pointer' : 'default', opacity: canUndo ? 1 : 0.4 }}
        >
          ↶ 撤销
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title={redoLabel ? `重做：${redoLabel} (Ctrl+Shift+Z)` : '重做 (Ctrl+Shift+Z)'}
          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #bdc3c7', background: '#fff', cursor: canRedo ? 'pointer' : 'default', opacity: canRedo ? 1 : 0.4 }}
        >
          ↷ 重做
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => updateChart(chart.id, (c) => ({ ...c, title: title.trim() || '未命名图解' }))}
          style={{ flex: 1, fontSize: 16, fontWeight: 500, border: 'none', outline: 'none', background: 'transparent' }}
        />
        <div style={{ fontSize: 12, color: '#888' }}>
          空格拖拽 · 滚轮缩放 · 右键吸色 · Ctrl+C/V 复制粘贴 · Ctrl+Z/Y 撤销重做
        </div>
      </header>
      <StatusBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Toolbar />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <CanvasGrid />
          <CanvasInfo />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}
