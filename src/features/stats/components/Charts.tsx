import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import './Charts.css';

/** A series slot from Charts.css (`--viz-series-N`): identity follows the measure, never its rank. */
export type SeriesColor = 'blue' | 'orange' | 'aqua' | 'yellow' | 'magenta' | 'violet' | 'gray';

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: SeriesColor;
}

const formatCount = (value: number): string => value.toLocaleString('pl-PL');

const formatShare = (value: number, total: number): string =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';

/** A hover tooltip that follows the pointer inside its chart (the chart root is `ref`). */
function useTooltip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; content: ReactNode } | null>(null);

  const show = (event: MouseEvent, content: ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: event.clientX - box.left, y: event.clientY - box.top, content });
  };

  const tooltip = tip && (
    <div className="viz-tooltip" style={{ left: tip.x, top: tip.y }} role="tooltip">
      {tip.content}
    </div>
  );

  return { ref, show, hide: () => setTip(null), tooltip };
}

function TooltipRow({ color, label, value }: { color?: SeriesColor; label: string; value: string }) {
  return (
    <div className="viz-tooltip__row">
      {color && <span className={`viz-swatch viz-swatch--${color}`} />}
      <span className="viz-tooltip__label">{label}</span>
      <span className="viz-tooltip__value">{value}</span>
    </div>
  );
}

function Legend({ segments, total }: { segments: Segment[]; total?: number }) {
  return (
    <ul className="viz-legend">
      {segments.map((segment) => (
        <li key={segment.key} className="viz-legend__item">
          <span className={`viz-swatch viz-swatch--${segment.color}`} />
          <span className="viz-legend__label">{segment.label}</span>
          <span className="viz-legend__value">{formatCount(segment.value)}</span>
          {total !== undefined && <span className="viz-legend__share">{formatShare(segment.value, total)}</span>}
        </li>
      ))}
    </ul>
  );
}

const DONUT_SIZE = 168;
const DONUT_STROKE = 22;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
/** Surface gap between neighbouring arcs, along the ring. */
const DONUT_GAP = 2;

interface DonutChartProps {
  segments: Segment[];
  /** Under the total in the hole. */
  centerLabel: string;
}

/** Parts of a whole: a ring with the total in its hole and a legend with counts and shares beside it. */
export function DonutChart({ segments, centerLabel }: DonutChartProps) {
  const { ref, show, hide, tooltip } = useTooltip();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const visible = segments.filter((segment) => segment.value > 0);
  const gap = visible.length > 1 ? DONUT_GAP : 0;
  const lengths = visible.map((segment) => (segment.value / total) * DONUT_CIRCUMFERENCE);
  // Where each arc starts along the ring: the summed lengths of the arcs before it.
  const offsets = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, length) => sum + length, 0));

  return (
    <div className="viz-donut" ref={ref}>
      <svg
        className="viz-donut__svg"
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        role="img"
        aria-label={`${centerLabel}: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`}
      >
        <g transform={`rotate(-90 ${DONUT_SIZE / 2} ${DONUT_SIZE / 2})`}>
          <circle
            className="viz-donut__track"
            cx={DONUT_SIZE / 2}
            cy={DONUT_SIZE / 2}
            r={DONUT_RADIUS}
            strokeWidth={DONUT_STROKE}
          />
          {visible.map((segment, index) => (
              <circle
                key={segment.key}
                className={`viz-donut__arc viz-stroke--${segment.color}`}
                cx={DONUT_SIZE / 2}
                cy={DONUT_SIZE / 2}
                r={DONUT_RADIUS}
                strokeWidth={DONUT_STROKE}
                strokeDasharray={`${Math.max(lengths[index] - gap, 0.5)} ${DONUT_CIRCUMFERENCE}`}
                strokeDashoffset={-offsets[index]}
                onMouseMove={(event) =>
                  show(
                    event,
                    <TooltipRow
                      color={segment.color}
                      label={segment.label}
                      value={`${formatCount(segment.value)} (${formatShare(segment.value, total)})`}
                    />,
                  )
                }
                onMouseLeave={hide}
              />
          ))}
        </g>
        <text className="viz-donut__total" x="50%" y="48%" textAnchor="middle" dominantBaseline="middle">
          {formatCount(total)}
        </text>
        <text className="viz-donut__caption" x="50%" y="63%" textAnchor="middle" dominantBaseline="middle">
          {centerLabel}
        </text>
      </svg>
      <Legend segments={segments} total={total} />
      {tooltip}
    </div>
  );
}

export interface BarRow {
  key: string | number;
  label: string;
  /** A quieter second line (e.g. a full name under the login). */
  sublabel?: string;
  segments: Segment[];
  /** Right of the bar; the summed segments when left out. */
  valueLabel?: string;
}

interface BarListProps {
  rows: BarRow[];
  /** Shown once above the rows; leave out for a single series (the card title names it). */
  legend?: Segment[];
  emptyText: string;
}

/**
 * Horizontal bars on one shared scale (the largest row fills the track); several segments stack left to right.
 * Long category names read better along a row than under a column.
 */
export function BarList({ rows, legend, emptyText }: BarListProps) {
  const { ref, show, hide, tooltip } = useTooltip();
  const totals = rows.map((row) => row.segments.reduce((sum, segment) => sum + segment.value, 0));
  const max = Math.max(...totals, 0);

  if (rows.length === 0) return <p className="viz-empty">{emptyText}</p>;

  return (
    <div className="viz-bars" ref={ref}>
      {legend && <Legend segments={legend} />}
      <ul className="viz-bars__rows">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className="viz-bars__row"
            onMouseMove={(event) =>
              show(
                event,
                <>
                  <div className="viz-tooltip__title">{row.label}</div>
                  {row.segments.map((segment) => (
                    <TooltipRow
                      key={segment.key}
                      color={segment.color}
                      label={segment.label}
                      value={formatCount(segment.value)}
                    />
                  ))}
                </>,
              )
            }
            onMouseLeave={hide}
          >
            <span className="viz-bars__label" title={row.label}>
              {row.label}
              {row.sublabel && <span className="viz-bars__sublabel">{row.sublabel}</span>}
            </span>
            <span className="viz-bars__track">
              {row.segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <span
                    key={segment.key}
                    className={`viz-bars__fill viz-fill--${segment.color}`}
                    style={{ width: `${max > 0 ? (segment.value / max) * 100 : 0}%` }}
                  />
                ))}
            </span>
            <span className="viz-bars__value">{row.valueLabel ?? formatCount(totals[index])}</span>
          </li>
        ))}
      </ul>
      {tooltip}
    </div>
  );
}

interface DailyColumnsProps {
  /** ISO dates, oldest first. */
  days: string[];
  values: number[];
  label: string;
  color: SeriesColor;
}

const formatDay = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

/** One measure per day as columns, with the scale's top value on a recessive gridline. */
export function DailyColumns({ days, values, label, color }: DailyColumnsProps) {
  const { ref, show, hide, tooltip } = useTooltip();
  const max = Math.max(...values, 0);
  const sum = values.reduce((total, value) => total + value, 0);

  return (
    <div className="viz-columns" ref={ref}>
      <div className="viz-columns__head">
        <span className="viz-columns__title">{label}</span>
        <span className="viz-columns__sum">{formatCount(sum)}</span>
      </div>
      <div className="viz-columns__plot">
        <span className="viz-columns__max">{formatCount(max)}</span>
        <div className="viz-columns__bars" role="img" aria-label={`${label}: ${formatCount(sum)} w ${days.length} dni`}>
          {values.map((value, index) => (
            <span
              key={days[index]}
              className="viz-columns__slot"
              onMouseMove={(event) =>
                show(
                  event,
                  <>
                    <div className="viz-tooltip__title">{formatDay(days[index])}</div>
                    <TooltipRow color={color} label={label} value={formatCount(value)} />
                  </>,
                )
              }
              onMouseLeave={hide}
            >
              <span
                className={`viz-columns__bar viz-fill--${color}`}
                style={{ height: max > 0 && value > 0 ? `max(2px, ${(value / max) * 100}%)` : 0 }}
              />
            </span>
          ))}
        </div>
      </div>
      <div className="viz-columns__axis">
        <span>{days.length > 0 && formatDay(days[0])}</span>
        <span>{days.length > 0 && formatDay(days[Math.floor(days.length / 2)])}</span>
        <span>dziś</span>
      </div>
      {tooltip}
    </div>
  );
}
