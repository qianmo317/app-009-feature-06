import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chart, Tool, Point, Rect } from '../types';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function createEmptyChart(cols = 64, rows = 64, title = '未命名图解'): Chart {
  return {
    id: generateId(),
    title,
    cols,
    rows,
    palette: [
      { id: generateId(), name: '背景', hex: '#ffffff' },
      { id: generateId(), name: '主色', hex: '#e74c3c' },
    ],
    cells: new Uint16Array(cols * rows),
    gauge: { stsPer10cm: 20, rowsPer10cm: 28 },
    yarn: { gramsPerSkein: 50, metersPerSkein: 125 },
  };
}

interface AppState {
  charts: Chart[];
  currentChartId: string | null;
  tool: Tool;
  selectedColorIndex: number;
  scale: number;
  offset: Point;
  clipboard: { cells: Uint16Array; cols: number; rows: number } | null;
  mirrorAxis: 'horizontal' | 'vertical';
  isDragging: boolean;
  lastPanPoint: Point | null;
  selection: Rect | null;
  isSelecting: boolean;
  showGrid: boolean;
}

interface AppActions {
  createChart: (cols?: number, rows?: number, title?: string) => string;
  deleteChart: (id: string) => void;
  duplicateChart: (id: string) => string;
  setCurrentChart: (id: string | null) => void;
  updateChart: (id: string, updater: (chart: Chart) => Chart) => void;
  setTool: (tool: Tool) => void;
  setSelectedColorIndex: (index: number) => void;
  setScale: (scale: number) => void;
  setOffset: (offset: Point) => void;
  panBy: (delta: Point) => void;
  setClipboard: (data: { cells: Uint16Array; cols: number; rows: number } | null) => void;
  setMirrorAxis: (axis: 'horizontal' | 'vertical') => void;
  setIsDragging: (v: boolean) => void;
  setLastPanPoint: (p: Point | null) => void;
  setSelection: (r: Rect | null) => void;
  setIsSelecting: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  getCurrentChart: () => Chart | null;
}

export const useChartStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      charts: [],
      currentChartId: null,
      tool: 'pencil',
      selectedColorIndex: 1,
      scale: 1,
      offset: { x: 0, y: 0 },
      clipboard: null,
      mirrorAxis: 'vertical',
      isDragging: false,
      lastPanPoint: null,
      selection: null,
      isSelecting: false,
      showGrid: true,

      createChart: (cols, rows, title) => {
        const chart = createEmptyChart(cols, rows, title);
        set((s) => ({ charts: [...s.charts, chart], currentChartId: chart.id }));
        return chart.id;
      },

      deleteChart: (id) => {
        set((s) => {
          const charts = s.charts.filter((c) => c.id !== id);
          return {
            charts,
            currentChartId: s.currentChartId === id ? (charts[0]?.id ?? null) : s.currentChartId,
          };
        });
      },

      duplicateChart: (id) => {
        const src = get().charts.find((c) => c.id === id);
        if (!src) return '';
        const chart: Chart = {
          ...src,
          id: generateId(),
          title: src.title + ' 副本',
          cells: new Uint16Array(src.cells),
        };
        set((s) => ({ charts: [...s.charts, chart], currentChartId: chart.id }));
        return chart.id;
      },

      setCurrentChart: (id) => set({ currentChartId: id }),

      updateChart: (id, updater) => {
        set((s) => ({
          charts: s.charts.map((c) => (c.id === id ? updater(c) : c)),
        }));
      },

      setTool: (tool) => set({ tool }),
      setSelectedColorIndex: (index) => set({ selectedColorIndex: index }),
      setScale: (scale) => set({ scale: Math.max(0.1, Math.min(16, scale)) }),
      setOffset: (offset) => set({ offset }),
      panBy: (delta) => set((s) => ({ offset: { x: s.offset.x + delta.x, y: s.offset.y + delta.y } })),
      setClipboard: (clipboard) => set({ clipboard }),
      setMirrorAxis: (mirrorAxis) => set({ mirrorAxis }),
      setIsDragging: (isDragging) => set({ isDragging }),
      setLastPanPoint: (lastPanPoint) => set({ lastPanPoint }),
      setSelection: (selection) => set({ selection }),
      setIsSelecting: (isSelecting) => set({ isSelecting }),
      setShowGrid: (showGrid) => set({ showGrid }),

      getCurrentChart: () => {
        const { charts, currentChartId } = get();
        return charts.find((c) => c.id === currentChartId) ?? null;
      },
    }),
    {
      name: 'knitting-chart-storage',
      partialize: (state) => ({
        charts: state.charts.map((c) => ({
          ...c,
          cells: Array.from(c.cells),
        })),
        currentChartId: state.currentChartId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.charts = state.charts.map((c: any) => ({
          ...c,
          cells: new Uint16Array(c.cells),
        }));
      },
    }
  )
);
