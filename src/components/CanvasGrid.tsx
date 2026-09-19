import { useRef, useEffect, useCallback } from 'react';
import { useChartStore } from '../store/chartStore';
import type { HistorySnapshot } from '../store/chartStore';
import type { Chart, Point, Rect } from '../types';

const BASE_CELL = 20;

function cellsChanged(a: Uint16Array, b: Uint16Array): boolean {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

export default function CanvasGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    tool,
    selectedColorIndex,
    scale,
    offset,
    mirrorAxis,
    isDragging,
    lastPanPoint,
    selection,
    isSelecting,
    showGrid,
    setScale,
    setOffset,
    setIsDragging,
    setLastPanPoint,
    setSelection,
    setIsSelecting,
    setClipboard,
    setSelectedColorIndex,
  } = useChartStore();

  // Use ref to access latest chart without causing re-renders
  const chartRef = useRef<Chart | null>(null);
  chartRef.current = useChartStore.getState().charts.find((c) => c.id === useChartStore.getState().currentChartId) ?? null;

  const drawingRef = useRef(false);
  const startCellRef = useRef<Point | null>(null);
  const previewRef = useRef<Rect | null>(null);
  const currentCellsRef = useRef<Uint16Array | null>(null);
  const strokeSnapshotRef = useRef<HistorySnapshot | null>(null);
  const rafRef = useRef<number>(0);
  const needsRedrawRef = useRef(true);

  // Keep latest values in refs for animation loop and event handlers
  const stateRef = useRef({ chart: chartRef.current, scale, offset, showGrid, selection, tool, selectedColorIndex, mirrorAxis });
  useEffect(() => {
    stateRef.current = { chart: chartRef.current, scale, offset, showGrid, selection, tool, selectedColorIndex, mirrorAxis };
    needsRedrawRef.current = true;
  }, [scale, offset, showGrid, selection, tool, selectedColorIndex, mirrorAxis]);

  // Subscribe to store changes for redraw without re-render
  useEffect(() => {
    const unsub = useChartStore.subscribe(() => {
      const newChart = useChartStore.getState().charts.find((c) => c.id === useChartStore.getState().currentChartId) ?? null;
      chartRef.current = newChart;
      stateRef.current.chart = newChart;
      needsRedrawRef.current = true;
    });
    return unsub;
  }, []);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent): Point | null => {
      const canvas = canvasRef.current;
      const st = stateRef.current;
      if (!canvas || !st.chart) return null;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / st.scale - st.offset.x;
      const y = (e.clientY - rect.top) / st.scale - st.offset.y;
      const cellSize = BASE_CELL;
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (col < 0 || col >= st.chart.cols || row < 0 || row >= st.chart.rows) return null;
      return { x: col, y: row };
    },
    []
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const st = stateRef.current;
    const c = st.chart;
    if (!c) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d')!;

    ctx.save();
    ctx.setTransform(st.scale, 0, 0, st.scale, st.offset.x * st.scale, st.offset.y * st.scale);

    const cellSize = BASE_CELL;
    const { cols, rows, palette, cells } = c;

    // Background
    ctx.fillStyle = '#faf8f5';
    ctx.fillRect(-st.offset.x, -st.offset.y, w / st.scale, h / st.scale);

    // Determine visible range
    const startCol = Math.max(0, Math.floor(-st.offset.x / cellSize));
    const startRow = Math.max(0, Math.floor(-st.offset.y / cellSize));
    const endCol = Math.min(cols, Math.ceil((w / st.scale - st.offset.x) / cellSize));
    const endRow = Math.min(rows, Math.ceil((h / st.scale - st.offset.y) / cellSize));

    // Cells
    for (let r = startRow; r < endRow; r++) {
      for (let cIdx = startCol; cIdx < endCol; cIdx++) {
        const idx = cells[r * cols + cIdx];
        const color = palette[idx]?.hex ?? '#ffffff';
        ctx.fillStyle = color;
        ctx.fillRect(cIdx * cellSize, r * cellSize, cellSize, cellSize);
      }
    }

    // Grid
    if (st.showGrid) {
      ctx.strokeStyle = '#e0dcd5';
      ctx.lineWidth = 0.5;
      for (let r = startRow; r <= endRow; r++) {
        const y = r * cellSize;
        ctx.beginPath();
        ctx.moveTo(startCol * cellSize, y);
        ctx.lineTo(endCol * cellSize, y);
        ctx.stroke();
      }
      for (let cIdx = startCol; cIdx <= endCol; cIdx++) {
        const x = cIdx * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, startRow * cellSize);
        ctx.lineTo(x, endRow * cellSize);
        ctx.stroke();
      }

      ctx.strokeStyle = '#c0bab0';
      ctx.lineWidth = 1;
      for (let r = Math.ceil(startRow / 10) * 10; r <= endRow; r += 10) {
        const y = r * cellSize;
        ctx.beginPath();
        ctx.moveTo(startCol * cellSize, y);
        ctx.lineTo(endCol * cellSize, y);
        ctx.stroke();
      }
      for (let cIdx = Math.ceil(startCol / 10) * 10; cIdx <= endCol; cIdx += 10) {
        const x = cIdx * cellSize;
        ctx.beginPath();
        ctx.moveTo(x, startRow * cellSize);
        ctx.lineTo(x, endRow * cellSize);
        ctx.stroke();
      }
    }

    // Selection preview
    if (previewRef.current) {
      const pr = previewRef.current;
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(pr.x * cellSize, pr.y * cellSize, pr.w * cellSize, pr.h * cellSize);
      ctx.setLineDash([]);
    }

    // Selection rect
    if (st.selection) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.strokeRect(st.selection.x * cellSize, st.selection.y * cellSize, st.selection.w * cellSize, st.selection.h * cellSize);
    }

    ctx.restore();
  }, []);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      if (needsRedrawRef.current) {
        needsRedrawRef.current = false;
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => { needsRedrawRef.current = true; };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const paintCell = (c: Chart, col: number, row: number, colorIdx: number) => {
    const idx = row * c.cols + col;
    if (idx < 0 || idx >= c.cells.length) return;
    const newCells = new Uint16Array(c.cells);
    newCells[idx] = colorIdx;

    if (tool === 'mirror') {
      if (mirrorAxis === 'vertical') {
        const mx = c.cols - 1 - col;
        const midx = row * c.cols + mx;
        if (midx >= 0 && midx < newCells.length) newCells[midx] = colorIdx;
      } else {
        const my = c.rows - 1 - row;
        const midx = my * c.cols + col;
        if (midx >= 0 && midx < newCells.length) newCells[midx] = colorIdx;
      }
    }

    return newCells;
  };

  const fillBucket = (c: Chart, startCol: number, startRow: number, colorIdx: number) => {
    const targetColor = c.cells[startRow * c.cols + startCol];
    if (targetColor === colorIdx) return c.cells;
    const newCells = new Uint16Array(c.cells);
    const stack: [number, number][] = [[startCol, startRow]];
    const visited = new Uint8Array(c.cols * c.rows);

    while (stack.length) {
      const [cc, r] = stack.pop()!;
      const idx = r * c.cols + cc;
      if (visited[idx]) continue;
      visited[idx] = 1;
      if (newCells[idx] !== targetColor) continue;
      newCells[idx] = colorIdx;

      if (cc > 0) stack.push([cc - 1, r]);
      if (cc < c.cols - 1) stack.push([cc + 1, r]);
      if (r > 0) stack.push([cc, r - 1]);
      if (r < c.rows - 1) stack.push([cc, r + 1]);
    }
    return newCells;
  };

  const drawLine = (c: Chart, x0: number, y0: number, x1: number, y1: number, colorIdx: number) => {
    const newCells = currentCellsRef.current ? new Uint16Array(currentCellsRef.current) : new Uint16Array(c.cells);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;

    while (true) {
      const idx = y * c.cols + x;
      if (idx >= 0 && idx < newCells.length) newCells[idx] = colorIdx;
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return newCells;
  };

  const drawRect = (c: Chart, x0: number, y0: number, x1: number, y1: number, colorIdx: number) => {
    const newCells = currentCellsRef.current ? new Uint16Array(currentCellsRef.current) : new Uint16Array(c.cells);
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * c.cols + x;
        if (idx >= 0 && idx < newCells.length) newCells[idx] = colorIdx;
      }
    }
    return newCells;
  };

  // 一次笔画（按下到抬起）合并为一条历史记录
  const commitStroke = (label: string) => {
    const before = strokeSnapshotRef.current;
    strokeSnapshotRef.current = null;
    if (!before) return;
    const st = useChartStore.getState();
    const chart = st.charts.find((ch) => ch.id === st.currentChartId);
    if (!chart) return;
    if (cellsChanged(before.cells, chart.cells)) st.pushHistory(label, before);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const c = stateRef.current.chart;
    if (!c) return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    if (e.button === 2) {
      const cell = getCellFromEvent(e);
      if (cell) {
        const idx = c.cells[cell.y * c.cols + cell.x];
        const paletteIdx = c.palette.findIndex((_, i) => i === idx);
        if (paletteIdx >= 0) setSelectedColorIndex(paletteIdx);
      }
      return;
    }
    if (e.button !== 0) return;

    const cell = getCellFromEvent(e);
    if (!cell) return;

    if (tool === 'select') {
      setIsSelecting(true);
      startCellRef.current = cell;
      setSelection(null);
      return;
    }

    drawingRef.current = true;
    startCellRef.current = cell;
    currentCellsRef.current = new Uint16Array(c.cells);
    strokeSnapshotRef.current = useChartStore.getState().takeSnapshot();

    if (tool === 'pencil' || tool === 'mirror') {
      const newCells = paintCell(c, cell.x, cell.y, selectedColorIndex);
      if (newCells) {
        useChartStore.getState().updateChart(c.id, (ch) => ({ ...ch, cells: newCells }));
      }
    } else if (tool === 'bucket') {
      const before = strokeSnapshotRef.current;
      strokeSnapshotRef.current = null;
      const newCells = fillBucket(c, cell.x, cell.y, selectedColorIndex);
      if (newCells !== c.cells) {
        useChartStore.getState().updateChart(c.id, (ch) => ({ ...ch, cells: newCells }));
        if (before) useChartStore.getState().pushHistory('油漆桶', before);
      }
      drawingRef.current = false;
    } else if (tool === 'line' || tool === 'rect') {
      previewRef.current = { x: cell.x, y: cell.y, w: 1, h: 1 };
      needsRedrawRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const c = stateRef.current.chart;
    if (!c) return;

    if (isDragging && lastPanPoint) {
      const dx = (e.clientX - lastPanPoint.x) / scale;
      const dy = (e.clientY - lastPanPoint.y) / scale;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    const cell = getCellFromEvent(e);
    if (!cell) return;

    if (isSelecting && startCellRef.current) {
      const sc = startCellRef.current;
      const x = Math.min(sc.x, cell.x);
      const y = Math.min(sc.y, cell.y);
      const w = Math.abs(cell.x - sc.x) + 1;
      const h = Math.abs(cell.y - sc.y) + 1;
      setSelection({ x, y, w, h });
      return;
    }

    if (!drawingRef.current || !startCellRef.current) return;

    if (tool === 'pencil' || tool === 'mirror') {
      const newCells = paintCell(c, cell.x, cell.y, selectedColorIndex);
      if (newCells) {
        useChartStore.getState().updateChart(c.id, (ch) => ({ ...ch, cells: newCells }));
      }
    } else if (tool === 'line') {
      previewRef.current = {
        x: Math.min(startCellRef.current.x, cell.x),
        y: Math.min(startCellRef.current.y, cell.y),
        w: Math.abs(cell.x - startCellRef.current.x) + 1,
        h: Math.abs(cell.y - startCellRef.current.y) + 1,
      };
      needsRedrawRef.current = true;
    } else if (tool === 'rect') {
      previewRef.current = {
        x: Math.min(startCellRef.current.x, cell.x),
        y: Math.min(startCellRef.current.y, cell.y),
        w: Math.abs(cell.x - startCellRef.current.x) + 1,
        h: Math.abs(cell.y - startCellRef.current.y) + 1,
      };
      needsRedrawRef.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setLastPanPoint(null);
      return;
    }
    if (isSelecting) {
      setIsSelecting(false);
      return;
    }
    const c = stateRef.current.chart;
    if (!drawingRef.current || !c || !startCellRef.current) return;

    const cell = getCellFromEvent(e);
    if (!cell) {
      if (tool === 'pencil' || tool === 'mirror') {
        commitStroke(tool === 'pencil' ? '铅笔' : '镜像');
      }
      drawingRef.current = false;
      startCellRef.current = null;
      previewRef.current = null;
      currentCellsRef.current = null;
      strokeSnapshotRef.current = null;
      needsRedrawRef.current = true;
      return;
    }

    if (tool === 'line') {
      const newCells = drawLine(c, startCellRef.current.x, startCellRef.current.y, cell.x, cell.y, selectedColorIndex);
      useChartStore.getState().updateChart(c.id, (ch) => ({ ...ch, cells: newCells }));
      commitStroke('直线');
    } else if (tool === 'rect') {
      const newCells = drawRect(c, startCellRef.current.x, startCellRef.current.y, cell.x, cell.y, selectedColorIndex);
      useChartStore.getState().updateChart(c.id, (ch) => ({ ...ch, cells: newCells }));
      commitStroke('矩形');
    } else if (tool === 'pencil' || tool === 'mirror') {
      commitStroke(tool === 'pencil' ? '铅笔' : '镜像');
    }

    drawingRef.current = false;
    startCellRef.current = null;
    previewRef.current = null;
    currentCellsRef.current = null;
    strokeSnapshotRef.current = null;
    needsRedrawRef.current = true;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(scale * delta);
    } else {
      setOffset({ x: offset.x - e.deltaX / scale, y: offset.y - e.deltaY / scale });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Copy / Paste / Undo / Redo shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const st = stateRef.current;
      const c = st.chart;
      if (!c) return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && !isEditable && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) useChartStore.getState().redo();
        else useChartStore.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !isEditable && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        useChartStore.getState().redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (st.selection) {
          const scols = st.selection.w;
          const srows = st.selection.h;
          const buf = new Uint16Array(scols * srows);
          for (let r = 0; r < srows; r++) {
            for (let cc = 0; cc < scols; cc++) {
              const srcIdx = (st.selection.y + r) * c.cols + (st.selection.x + cc);
              buf[r * scols + cc] = c.cells[srcIdx];
            }
          }
          setClipboard({ cells: buf, cols: scols, rows: srows });
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const cb = useChartStore.getState().clipboard;
        if (cb && st.selection) {
          const before = useChartStore.getState().takeSnapshot();
          const newCells = new Uint16Array(c.cells);
          for (let r = 0; r < cb.rows; r++) {
            for (let cc = 0; cc < cb.cols; cc++) {
              const tx = st.selection.x + cc;
              const ty = st.selection.y + r;
              if (tx < c.cols && ty < c.rows) {
                newCells[ty * c.cols + tx] = cb.cells[r * cb.cols + cc];
              }
            }
          }
          if (before && cellsChanged(before.cells, newCells)) {
            useChartStore.getState().updateChart(c.id, (ch) => ({ ...ch, cells: newCells }));
            useChartStore.getState().pushHistory('粘贴', before);
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setClipboard]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        cursor: isDragging ? 'grabbing' : tool === 'picker' ? 'crosshair' : 'default',
        background: '#f5f3ef',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
