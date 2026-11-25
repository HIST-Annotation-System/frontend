import Button from '../../../components/ui/Button';
import type { ToolMode } from '../../../types/annotation';
import { TOOL_MODES } from './toolModes';
import './AnnotationTools.css';

interface ToolModeToggleProps {
  mode: ToolMode;
  onChange: (mode: ToolMode) => void;
}

export default function ToolModeToggle({ mode, onChange }: ToolModeToggleProps) {
  return (
    <div className="tool-mode-toggle" role="group" aria-label="Tryb pracy">
      {TOOL_MODES.map(({ mode: toolMode, label, title, Icon }) => (
        <Button
          key={toolMode}
          active={mode === toolMode}
          icon={<Icon size={18} />}
          title={title}
          aria-label={label}
          onClick={() => onChange(toolMode)}
        />
      ))}
    </div>
  );
}
