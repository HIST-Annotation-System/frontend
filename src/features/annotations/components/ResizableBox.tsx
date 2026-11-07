import { useRef, useState, type ReactNode } from 'react';

const MIN_HEIGHT_PX = 24;
const MAX_HEIGHT_PX = 2000;

const readHeight = (storageKey: string, fallback: number): number => {
  try {
    const stored = Number(localStorage.getItem(storageKey));
    return stored >= MIN_HEIGHT_PX ? stored : fallback;
  } catch {
    return fallback;
  }
};

interface ResizableBoxProps {
  /** Where the chosen height is remembered (localStorage). */
  storageKey: string;
  defaultHeight: number;
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * A scrolling box whose height the user drags with the bar under it (double click restores the default).
 * Its content is never taller than needed: the height is a maximum, so a short list leaves no gap.
 */
export default function ResizableBox({ storageKey, defaultHeight, label, className, children }: ResizableBoxProps) {
  const [height, setHeight] = useState(() => readHeight(storageKey, defaultHeight));
  const drag = useRef<{ startY: number; startHeight: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const save = (value: number) => {
    try {
      localStorage.setItem(storageKey, String(Math.round(value)));
    } catch {
      // Not remembered (private window): the height still applies now.
    }
  };

  return (
    <>
      <div ref={boxRef} className={className} style={{ maxHeight: height }}>
        {children}
      </div>
      <div
        className="resize-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label={`Zmień wysokość: ${label}`}
        title="Przeciągnij, aby zmienić wysokość (dwuklik przywraca domyślną)"
        onPointerDown={(event) => {
          // Start from what is shown: a short list may be lower than the stored maximum.
          const shown = boxRef.current?.getBoundingClientRect().height ?? height;
          drag.current = { startY: event.clientY, startHeight: shown };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const next = drag.current.startHeight + event.clientY - drag.current.startY;
          setHeight(Math.min(MAX_HEIGHT_PX, Math.max(MIN_HEIGHT_PX, next)));
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          drag.current = null;
          save(height);
        }}
        onDoubleClick={() => {
          setHeight(defaultHeight);
          save(defaultHeight);
        }}
      />
    </>
  );
}
