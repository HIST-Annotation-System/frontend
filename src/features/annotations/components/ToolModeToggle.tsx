import { MousePointer, Pencil, Pentagon, Spline } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { ToolMode } from '../../../types/annotation';
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
        title="Nawigacja i edycja"
        aria-label="Nawigacja"
        onClick={() => onChange('navigate')}
      />
      <Button
        active={mode === 'polygon'}
        icon={<Pentagon size={16} />}
        title="Poligon (proste odcinki)"
        aria-label="Poligon"
        onClick={() => onChange('polygon')}
      />
      <Button
        active={mode === 'curve'}
        icon={<Spline size={16} />}
        title="Krzywa (gładka krzywa przez klikane punkty)"
        aria-label="Krzywa"
        onClick={() => onChange('curve')}
      />
      <Button
        active={mode === 'freehand'}
        icon={<Pencil size={16} />}
        title="Rysowanie ręczne"
        aria-label="Rysowanie ręczne"
        onClick={() => onChange('freehand')}
      />
    </div>
  );
}
