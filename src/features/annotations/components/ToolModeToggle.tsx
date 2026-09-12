import { MousePointer, PenTool } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { ToolMode } from '../hooks/useAnnotationTool';
import './AnnotationTools.css';

interface ToolModeToggleProps {
  mode: ToolMode;
  onChange: (mode: ToolMode) => void;
}

export default function ToolModeToggle({ mode, onChange }: ToolModeToggleProps) {
  return (
    <div className="tool-mode-toggle" role="group" aria-label="Tryb pracy">
      <Button
        active={mode === 'navigate'}
        icon={<MousePointer size={16} />}
        title="Nawigacja"
        aria-label="Nawigacja"
        onClick={() => onChange('navigate')}
      />
      <Button
        active={mode === 'draw'}
        icon={<PenTool size={16} />}
        title="Poligon"
        aria-label="Poligon"
        onClick={() => onChange('draw')}
      />
    </div>
  );
}
