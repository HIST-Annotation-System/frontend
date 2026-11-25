import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeProvider';

/** Light/dark switch in a corner of the login screens. */
export default function AuthAppearance() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw';
  return (
    <div className="auth-appearance">
      <button type="button" className="auth-appearance__theme" onClick={toggleTheme} title={label} aria-label={label}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}
