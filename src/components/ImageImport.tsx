import { useRef, useState } from 'react';
import { useChartStore } from '../store/chartStore';
import { rgbToHex } from '../utils/quantize';

export default function ImageImport() {
  const chart = useChartStore((s) => s.getCurrentChart());
  const updateChart = useChartStore((s) => s.updateChart);
  const [loading, setLoading] = useState(false);
  const [maxColors, setMaxColors] = useState(8);
  const [targetCols, setTargetCols] = useState(64);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!chart) return;
    setLoading(true);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const aspect = img.height / img.width;
    const cols = targetCols;
    const rows = Math.round(cols * aspect);
    canvas.width = cols;
    canvas.height = rows;
    ctx.drawImage(img, 0, 0, cols, rows);

    const imageData = ctx.getImageData(0, 0, cols, rows);

    // Use worker for quantization
    const worker = new Worker(new URL('../workers/quantize.worker.ts', import.meta.url), { type: 'module' });
    worker.postMessage({ imageData, maxColors });
    worker.onmessage = (e) => {
      const { palette, indices } = e.data;
      const newPalette = palette.map((rgb: [number, number, number], i: number) => ({
        id: Math.random().toString(36).slice(2),
        name: `颜色 ${i + 1}`,
        hex: rgbToHex(rgb),
      }));

      updateChart(chart.id, (c) => ({
        ...c,
        cols,
        rows,
        palette: newPalette,
        cells: indices,
      }));

      setLoading(false);
      worker.terminate();
    };
  };

  return (
    <div style={{ padding: 12, borderBottom: '1px solid #e0dcd5' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>图片转图解</h3>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        ref={fileRef}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          目标针数:
          <input type="number" value={targetCols} onChange={(e) => setTargetCols(Number(e.target.value))} style={{ width: 60, fontSize: 11 }} />
        </label>
        <label style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          最大颜色数:
          <input type="number" value={maxColors} onChange={(e) => setMaxColors(Number(e.target.value))} style={{ width: 60, fontSize: 11 }} />
        </label>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            borderRadius: 4,
            border: '1px solid #3498db',
            background: '#3498db',
            color: '#fff',
            cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '处理中...' : '导入 PNG'}
        </button>
      </div>
    </div>
  );
}
