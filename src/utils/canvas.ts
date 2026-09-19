import type { Chart } from '../types';

export function drawChartToCanvas(
  chart: Chart,
  canvas: HTMLCanvasElement,
  options?: { showGrid?: boolean; cellSize?: number; startRow?: number; endRow?: number }
) {
  const { cols, rows, palette, cells } = chart;
  const cellSize = options?.cellSize ?? 20;
  const showGrid = options?.showGrid ?? true;
  const startRow = options?.startRow ?? 0;
  const endRow = options?.endRow ?? rows;
  const visibleRows = endRow - startRow;

  canvas.width = cols * cellSize;
  canvas.height = visibleRows * cellSize;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cells
  for (let r = startRow; r < endRow; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = cells[r * cols + c];
      const color = palette[idx]?.hex ?? '#ffffff';
      ctx.fillStyle = color;
      ctx.fillRect(c * cellSize, (r - startRow) * cellSize, cellSize, cellSize);
    }
  }

  // Grid
  if (showGrid) {
    ctx.strokeStyle = '#e0dcd5';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= visibleRows; r++) {
      const y = r * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      const x = c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Bold lines every 10
    ctx.strokeStyle = '#c0bab0';
    ctx.lineWidth = 1;
    for (let r = 0; r <= visibleRows; r += 10) {
      const y = r * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c += 10) {
      const x = c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
  }
}

export function exportChartPNG(chart: Chart, scale = 8): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawChartToCanvas(chart, canvas, { showGrid: true, cellSize: 20 * scale });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}
