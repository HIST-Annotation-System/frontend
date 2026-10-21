import { Check, Palette } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { PALETTES, type PaletteGroup } from '../../context/palettes';
import './PaletteSwitcher.css';

const GROUP_LABELS: Record<PaletteGroup, string> = {
  classic: 'Spokojne',
  bold: 'Odważne',
};

interface PaletteSwitcherProps {
  /** Opens the list upwards (e.g. in a bottom corner). */
  dropUp?: boolean;
}

/** Lets the team try the colour palettes on every screen; the choice is kept in this browser. */
export default function PaletteSwitcher({ dropUp = false }: PaletteSwitcherProps) {
  const { theme, palette, setPalette } = useTheme();
  const [open, setOpen] = useState(false);
  const current = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="palette-switcher">
      <button
        type="button"
        className={`palette-switcher__trigger${open ? ' palette-switcher__trigger--open' : ''}`}
        onClick={() => setOpen(!open)}
        title={`Paleta kolorów: ${current.name}`}
        aria-label={`Paleta kolorów: ${current.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Palette size={14} aria-hidden="true" />
        <span className="palette-switcher__dots" aria-hidden="true">
          {current[theme].slice(2).map((color) => (
            <span key={color} className="palette-switcher__dot" style={{ background: color }} />
          ))}
        </span>
      </button>

      {open && (
        <>
          <div className="palette-switcher__backdrop" onClick={() => setOpen(false)} />
          <div className={`palette-switcher__menu${dropUp ? ' palette-switcher__menu--up' : ''}`} role="menu">
            {(Object.keys(GROUP_LABELS) as PaletteGroup[]).map((group) => (
              <div key={group} className="palette-switcher__group">
                <span className="palette-switcher__group-label">{GROUP_LABELS[group]}</span>
                {PALETTES.filter((p) => p.group === group).map((option) => {
                  const active = option.id === current.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={`palette-switcher__item${active ? ' palette-switcher__item--active' : ''}`}
                      onClick={() => {
                        setPalette(option.id);
                        setOpen(false);
                      }}
                    >
                      <span className="palette-switcher__swatch" aria-hidden="true">
                        {option[theme].map((color, i) => (
                          <span key={i} style={{ background: color }} />
                        ))}
                      </span>
                      <span className="palette-switcher__name">{option.name}</span>
                      {active && <Check size={14} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
