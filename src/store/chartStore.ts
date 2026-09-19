import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chart, Palette, Tool, Point, Rect } from '../types';

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

// 一次落笔前的完整快照：格子、调色板、画布尺寸和当时选中的颜色
export type HistoryEntry = {
  chartId: string;
  cols: number;
  rows: number;
  palette: Palette[];
  cells: Uint16Array;
  selectedColorIndex: number;
};

const HISTORY_LIMIT = 100;

function takeSnapshot(state: {
  charts: Chart[];
  currentChartId: string | null;
  selectedColorIndex: number;
}): HistoryEntry | null {
  const chart = state.charts.find((c) => c.id === state.currentChartId);
  if (!chart) return null;
  return {
    chartId: chart.id,
    cols: chart.cols,
    rows: chart.rows,
    palette: chart.palette.map((p) => ({ ...p })),
    cells: new Uint16Array(chart.cells),
    selectedColorIndex: state.selectedColorIndex,
  };
}

function applyEntry(chart: Chart, entry: HistoryEntry): Chart {
  return {
    ...chart,
    cols: entry.cols,
    rows: entry.rows,
    palette: entry.palette.map((p) => ({ ...p })),
    cells: new Uint16Array(entry.cells),
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
  history: { past: HistoryEntry[]; future: HistoryEntry[] };
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
  recordHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
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
      history: { past: [], future: [] },

      createChart: (cols, rows, title) => {
        const chart = createEmptyChart(cols, rows, title);
        set((s) => ({
          charts: [...s.charts, chart],
          currentChartId: chart.id,
          history: { past: [], future: [] },
        }));
        return chart.id;
      },

      deleteChart: (id) => {
        set((s) => {
          const charts = s.charts.filter((c) => c.id !== id);
          return {
            charts,
            currentChartId: s.currentChartId === id ? (charts[0]?.id ?? null) : s.currentChartId,
            history: { past: [], future: [] },
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
        set((s) => ({
          charts: [...s.charts, chart],
          currentChartId: chart.id,
          history: { past: [], future: [] },
        }));
        return chart.id;
      },

      setCurrentChart: (id) =>
        set((s) => ({
          currentChartId: id,
          // 切到别的图时清空操作记忆
          history: id === s.currentChartId ? s.history : { past: [], future: [] },
        })),

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

      // 落笔前调用：把当前状态压入历史，并丢掉已撤销的后续记录
      recordHistory: () => {
        set((s) => {
          const snap = takeSnapshot(s);
          if (!snap) return {};
          let past = [...s.history.past, snap];
          if (past.length > HISTORY_LIMIT) past = past.slice(past.length - HISTORY_LIMIT);
          return { history: { past, future: [] } };
        });
      },

      undo: () => {
        const s = get();
        const entry = s.history.past[s.history.past.length - 1];
        if (!entry || entry.chartId !== s.currentChartId) return;
        const current = takeSnapshot(s);
        if (!current) return;
        set((state) => ({
          charts: state.charts.map((c) => (c.id === entry.chartId ? applyEntry(c, entry) : c)),
          selectedColorIndex: entry.selectedColorIndex,
          history: {
            past: state.history.past.slice(0, -1),
            future: [...state.history.future, current],
          },
        }));
      },

      redo: () => {
        const s = get();
        const entry = s.history.future[s.history.future.length - 1];
        if (!entry || entry.chartId !== s.currentChartId) return;
        const current = takeSnapshot(s);
        if (!current) return;
        set((state) => ({
          charts: state.charts.map((c) => (c.id === entry.chartId ? applyEntry(c, entry) : c)),
          selectedColorIndex: entry.selectedColorIndex,
          history: {
            past: [...state.history.past, current],
            future: state.history.future.slice(0, -1),
          },
        }));
      },

      clearHistory: () => set({ history: { past: [], future: [] } }),

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
