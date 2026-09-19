import PalettePanel from './PalettePanel';
import LegendPanel from './LegendPanel';
import YarnCalcPanel from './YarnCalcPanel';
import ImageImport from './ImageImport';
import ExportPanel from './ExportPanel';

export default function RightPanel() {
  return (
    <div style={{ width: 240, background: '#fff', borderLeft: '1px solid #e0dcd5', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <PalettePanel />
      <LegendPanel />
      <YarnCalcPanel />
      <ImageImport />
      <ExportPanel />
    </div>
  );
}
