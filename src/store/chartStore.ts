import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chart, Tool, Point, Rect, Palette } from '../types';

const MAX_HISTORY = 50;

export type HistorySnapshot = {
  cells: Uint16Array;
  palette: Palette[];
  cols: number;
  rows: number;
  selectedColorIndex: number;
};

export type HistoryEntry = {
  label: string;
  before: HistorySnapshot;
  after: HistorySnapshot;
};

function applySnapshot(chart: Chart, snap: HistorySnapshot): Chart {
  return {
    ...chart,
    cols: snap.cols,
    rows: snap.rows,
    palette: snap.palette.map((p) => ({ ...p })),
    cells: new Uint16Array(snap.cells),
  };
}

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
  history: HistoryEntry[];
  historyIndex: number;
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
  takeSnapshot: () => HistorySnapshot | null;
  pushHistory: (label: string, before: HistorySnapshot) => void;
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
      history: [],
      historyIndex: 0,

      createChart: (cols, rows, title) => {
        const chart = createEmptyChart(cols, rows, title);
        set((s) => ({ charts: [...s.charts, chart], currentChartId: chart.id, history: [], historyIndex: 0 }));
        return chart.id;
      },

      deleteChart: (id) => {
        set((s) => {
          const charts = s.charts.filter((c) => c.id !== id);
          const currentChartId = s.currentChartId === id ? (charts[0]?.id ?? null) : s.currentChartId;
          const switched = currentChartId !== s.currentChartId;
          return {
            charts,
            currentChartId,
            ...(switched ? { history: [], historyIndex: 0 } : {}),
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
        set((s) => ({ charts: [...s.charts, chart], currentChartId: chart.id, history: [], historyIndex: 0 }));
        return chart.id;
      },

      setCurrentChart: (id) =>
        set((s) => (id === s.currentChartId ? {} : { currentChartId: id, history: [], historyIndex: 0 })),

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

      takeSnapshot: () => {
        const s = get();
        const chart = s.charts.find((c) => c.id === s.currentChartId);
        if (!chart) return null;
        return {
          cells: new Uint16Array(chart.cells),
          palette: chart.palette.map((p) => ({ ...p })),
          cols: chart.cols,
          rows: chart.rows,
          selectedColorIndex: s.selectedColorIndex,
        };
      },

      pushHistory: (label, before) => {
        const s = get();
        const chart = s.charts.find((c) => c.id === s.currentChartId);
        if (!chart) return;
        const after: HistorySnapshot = {
          cells: new Uint16Array(chart.cells),
          palette: chart.palette.map((p) => ({ ...p })),
          cols: chart.cols,
          rows: chart.rows,
          selectedColorIndex: s.selectedColorIndex,
        };
        set((st) => {
          // 退到中间某一步后再落笔：丢掉后面的记录
          const kept = st.history.slice(0, st.historyIndex);
          if (kept.length >= MAX_HISTORY) kept.shift();
          return { history: [...kept, { label, before, after }], historyIndex: kept.length + 1 };
        });
      },

      undo: () => {
        const { history, historyIndex, currentChartId } = get();
        if (historyIndex <= 0) return;
        const entry = history[historyIndex - 1];
        set((s) => ({
          historyIndex: s.historyIndex - 1,
          selectedColorIndex: Math.min(
            entry.before.selectedColorIndex,
            Math.max(0, entry.before.palette.length - 1)
          ),
          charts: s.charts.map((c) => (c.id === currentChartId ? applySnapshot(c, entry.before) : c)),
        }));
      },

      redo: () => {
        const { history, historyIndex, currentChartId } = get();
        if (historyIndex >= history.length) return;
        const entry = history[historyIndex];
        set((s) => ({
          historyIndex: s.historyIndex + 1,
          selectedColorIndex: Math.min(
            entry.after.selectedColorIndex,
            Math.max(0, entry.after.palette.length - 1)
          ),
          charts: s.charts.map((c) => (c.id === currentChartId ? applySnapshot(c, entry.after) : c)),
        }));
      },

      clearHistory: () => set({ history: [], historyIndex: 0 }),

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
