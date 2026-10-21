import type { ReactNode } from 'react';
import SidebarSection from '../../../components/ui/SidebarSection';
import ViewerNavigator from './ViewerNavigator';
import './ViewerLayout.css';

interface ViewerLayoutProps {
  /** Tool column docked to the canvas's left edge. */
  tools?: ReactNode;
  /** Inspector panels below the navigator. */
  inspector?: ReactNode;
  inspectorOpen: boolean;
  status: ReactNode;
  /** The OpenSeadragon viewer and the overlays drawn on it. */
  children: ReactNode;
}

/** Viewer workspace: tools | dark canvas | inspector, over a status bar. Nothing floats over the image. */
export default function ViewerLayout({ tools, inspector, inspectorOpen, status, children }: ViewerLayoutProps) {
  return (
    <div className="viewer-layout">
      {tools && <div className="viewer-layout__tools">{tools}</div>}
      {/* Before the canvas: the navigator host must exist when the viewer is created (see ViewerNavigator). */}
      <aside className="viewer-layout__inspector" hidden={!inspectorOpen} aria-label="Inspektor">
        <SidebarSection title="Nawigator">
          <ViewerNavigator />
        </SidebarSection>
        {inspector}
      </aside>
      <div className="viewer-layout__stage">{children}</div>
      <footer className="viewer-layout__status">{status}</footer>
    </div>
  );
}
