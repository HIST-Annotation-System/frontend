import { Moon, Sun } from 'lucide-react';
import PaletteSwitcher from '../../components/layout/PaletteSwitcher';
import { useTheme } from '../../context/ThemeProvider';

/** Palette and light/dark switch in a corner of the login screens. */
export default function AuthAppearance() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw';
  return (
    <div className="auth-appearance">
      <PaletteSwitcher dropUp />
      <button type="button" className="auth-appearance__theme" onClick={toggleTheme} title={label} aria-label={label}>
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </div>
  );
}
