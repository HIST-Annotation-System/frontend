import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '../../components/ui/Button';
import { BarList, DailyColumns, DonutChart, type Segment, type SeriesColor } from '../../features/stats/components/Charts';
import { useStats } from '../../features/stats/hooks/useStats';
import { HOTSPOT_STATUS_OPTIONS } from '../../features/hotspots/utils/hotspotReview';
import { TAG_DIMENSIONS } from '../../features/hotspots/utils/hotspotTags';
import type { HotspotStatus } from '../../types/hotspot';
import type { Stats } from '../../types/stats';
import type { TagDimension } from '../../types/tag';
import { getErrorMessage } from '../../utils/errors';
import { formatBytes, formatDateTime, formatDecimal } from '../../utils/format';
import './StatsPage.css';

/** One colour per review stage, the same in every chart on the page. */
const STATUS_COLORS: Record<HotspotStatus, SeriesColor> = {
  untagged: 'blue',
  to_reannotate: 'orange',
  reannotated: 'aqua',
};

/** Core tags of a dimension in their order (heaviest first); "no verdict" stays gray. */
const VERDICT_COLORS: SeriesColor[] = ['violet', 'magenta', 'yellow'];

const statusLabel = (status: HotspotStatus): string =>
  HOTSPOT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

const statusSegments = (counts: Record<HotspotStatus, number>): Segment[] =>
  HOTSPOT_STATUS_OPTIONS.map(({ value }) => ({
    key: value,
    label: statusLabel(value),
    value: counts[value],
    color: STATUS_COLORS[value],
  }));

const formatCount = (value: number): string => value.toLocaleString('pl-PL');

const formatDuration = (hours: number): string => {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${formatDecimal(hours, hours < 10 ? 1 : 0)} h`;
  return `${formatDecimal(hours / 24, 1)} dni`;
};

const formatTime = (isoDate: string): string =>
  new Date(isoDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** Admin observability: where hotspots are in the review, who is annotating what, and how fast it goes. */
export default function StatsPage() {
  const { data: stats, isLoading, isFetching, error, refetch } = useStats();

  return (
    <div className="admin-page stats-page viz-root">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Statystyki</h1>
        <span className="admin-page-spacer" />
        {stats && <span className="stats-updated">Zaktualizowano {formatTime(stats.generated_at)}</span>}
        <Button
          variant="ghost"
          icon={<RefreshCw size={14} className={isFetching ? 'stats-spin' : undefined} />}
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          Odśwież
        </Button>
      </div>

      {isLoading && <div className="admin-loading">Ładowanie…</div>}
      {error && !stats && (
        <p className="admin-alert" role="alert">
          {getErrorMessage(error, 'Nie udało się wczytać statystyk.')}
        </p>
      )}
      {stats && <StatsBody stats={stats} />}
    </div>
  );
}

function StatsBody({ stats }: { stats: Stats }) {
  const { hotspots } = stats;
  const totalHotspots = hotspots.untagged + hotspots.to_reannotate + hotspots.reannotated;
  const tagged = hotspots.to_reannotate + hotspots.reannotated;
  const annotatorAccounts = stats.annotators.filter((annotator) => annotator.role === 'ANNOTATOR');
  const activeLastWeek = stats.annotators.filter((annotator) => annotator.annotations_last_7_days > 0).length;
  const annotationsLastWeek = stats.activity.slice(-7).reduce((sum, day) => sum + day.annotations, 0);
  const readySlides = stats.slides.find((slide) => slide.status === 'ready')?.count ?? 0;
  const totalSlides = stats.slides.reduce((sum, slide) => sum + slide.count, 0);
  const failedSlides = stats.slides.find((slide) => slide.status === 'failed')?.count ?? 0;
  const days = stats.activity.map((day) => day.day);
  const idleAnnotators = annotatorAccounts.filter((annotator) => annotator.in_progress === 0).length;

  return (
    <div className="stats-body">
      <section className="stats-tiles" aria-label="Podsumowanie">
        <StatTile
          label="Czekają na anotację"
          value={formatCount(hotspots.to_reannotate)}
          note={`${totalHotspots > 0 ? Math.round((hotspots.to_reannotate / totalHotspots) * 100) : 0}% hotspotów`}
          color="orange"
          emphasis
        />
        <StatTile
          label="Poprawione"
          value={formatCount(hotspots.reannotated)}
          note={`${tagged > 0 ? Math.round((hotspots.reannotated / tagged) * 100) : 0}% ocenionych`}
          color="aqua"
        />
        <StatTile
          label="Nieocenione"
          value={formatCount(hotspots.untagged)}
          note={`z ${formatCount(totalHotspots)} w ${formatCount(stats.hotspot_folders)} folderach`}
          color="blue"
        />
        <StatTile
          label="Anotacje"
          value={formatCount(stats.annotations)}
          note={`+${formatCount(annotationsLastWeek)} w ostatnich 7 dniach`}
        />
        <StatTile
          label="Aktywni (7 dni)"
          value={`${activeLastWeek} / ${stats.annotators.length}`}
          note={`anotatorzy bez pracy w toku: ${idleAnnotators}`}
        />
        <StatTile
          label="Mediana czasu do poprawienia"
          value={stats.median_hours_to_reannotate === null ? '—' : formatDuration(stats.median_hours_to_reannotate)}
          note="od dodania hotspotu"
        />
        <StatTile
          label="Slajdy"
          value={`${formatCount(readySlides)} / ${formatCount(totalSlides)}`}
          note={`gotowe · ${formatBytes(stats.slides_total_bytes)}${failedSlides ? ` · ${failedSlides} z błędem` : ''}`}
        />
        <StatTile
          label="Konta"
          value={formatCount(stats.accounts.admins + stats.accounts.annotators)}
          note={`anotatorzy: ${stats.accounts.annotators} · przed 1. logowaniem: ${stats.accounts.pending_first_login}`}
        />
      </section>

      <div className="stats-grid">
        <Card title="Etapy przeglądu hotspotów" subtitle="Nieocenione → do reannotacji → poprawione">
          <DonutChart segments={statusSegments(hotspots)} centerLabel="hotspotów" />
        </Card>

        <Card
          title="Obciążenie anotatorów"
          subtitle="Hotspoty z ich anotacjami, jeszcze nieoznaczone jako poprawione, i hotspoty przez nich zakończone"
        >
          <BarList
            legend={[
              { key: 'in_progress', label: 'W toku', value: sumOf(stats, 'in_progress'), color: 'orange' },
              { key: 'finished', label: 'Zakończone', value: sumOf(stats, 'finished'), color: 'aqua' },
            ]}
            rows={stats.annotators.map((annotator) => ({
              key: annotator.account_id,
              label: annotator.full_name ?? annotator.username,
              sublabel: annotator.full_name ? annotator.username : undefined,
              segments: [
                { key: 'in_progress', label: 'W toku', value: annotator.in_progress, color: 'orange' },
                { key: 'finished', label: 'Zakończone', value: annotator.finished, color: 'aqua' },
              ],
              valueLabel: `${annotator.in_progress} / ${annotator.finished}`,
            }))}
            emptyText="Brak anotatorów."
          />
        </Card>
      </div>

      <Card title="Aktywność" subtitle={`Ostatnie ${stats.activity.length} dni`}>
        <div className="stats-multiples">
          <DailyColumns
            days={days}
            values={stats.activity.map((day) => day.annotations)}
            label="Narysowane anotacje"
            color="violet"
          />
          <DailyColumns
            days={days}
            values={stats.activity.map((day) => day.reannotated)}
            label="Hotspoty oznaczone jako poprawione"
            color="aqua"
          />
          <DailyColumns
            days={days}
            values={stats.activity.map((day) => day.hotspots_created)}
            label="Dodane hotspoty"
            color="blue"
          />
        </div>
      </Card>

      <div className="stats-grid">
        <Card title="Postęp folderów" subtitle="Hotspoty w każdym folderze według etapu przeglądu">
          <BarList
            legend={statusSegments(hotspots)}
            rows={stats.folders.map((folder) => {
              const total = folder.untagged + folder.to_reannotate + folder.reannotated;
              return {
                key: folder.id,
                label: folder.name,
                sublabel: `${formatCount(total)} hotspotów`,
                segments: statusSegments(folder),
                valueLabel: total > 0 ? `${Math.round((folder.reannotated / total) * 100)}%` : '—',
              };
            })}
            emptyText="Brak folderów."
          />
        </Card>

        <Card title="Anotacje według typu komórek" subtitle="Ile poligonów narysowano dla każdego typu">
          <BarList
            rows={stats.cell_types.map((cellType) => ({
              key: cellType.id,
              label: cellType.name,
              segments: [{ key: 'annotations', label: 'Anotacje', value: cellType.annotations, color: 'violet' }],
            }))}
            emptyText="Brak typów komórek."
          />
        </Card>
      </div>

      <div className="stats-grid stats-grid--3">
        {TAG_DIMENSIONS.map((dimension) => (
          <Card key={dimension.value} title={`Oceny: ${dimension.label.toLowerCase()}`}>
            <DonutChart segments={verdictSegments(stats, dimension.value, totalHotspots)} centerLabel="hotspotów" />
          </Card>
        ))}
        <Card title="Tagi własne" subtitle="Hotspoty oznaczone tagami dodanymi przez ekspertów">
          <BarList
            rows={stats.tags
              .filter((tag) => tag.dimension === null)
              .map((tag) => ({
                key: tag.id,
                label: tag.name,
                segments: [{ key: 'hotspots', label: 'Hotspoty', value: tag.hotspots, color: 'yellow' }],
              }))}
            emptyText="Brak tagów własnych."
          />
        </Card>
      </div>

      <Card title="Annotatorzy - szczegóły" flush>
        <table className="admin-table stats-table">
          <thead>
            <tr>
              <th>Anotator</th>
              <th>Rola</th>
              <th className="admin-table__num">W toku</th>
              <th className="admin-table__num">Zakończone</th>
              <th className="admin-table__num">Anotacje</th>
              <th className="admin-table__num">Ostatnie 7 dni</th>
              <th className="admin-table__num">Śr. anotacji / hotspot</th>
              <th className="admin-table__num">Tagi i oceny</th>
              <th>Ostatnia aktywność</th>
            </tr>
          </thead>
          <tbody>
            {stats.annotators.map((annotator) => {
              const hotspotsTouched = annotator.in_progress + annotator.finished;
              return (
                <tr key={annotator.account_id}>
                  <td>
                    <span className="stats-table__name">{annotator.full_name ?? annotator.username}</span>
                    {annotator.full_name && <span className="admin-table__faint"> · {annotator.username}</span>}
                  </td>
                  <td className="admin-table__muted">{annotator.role === 'ADMIN' ? 'Administrator' : 'Anotator'}</td>
                  <td className="admin-table__num">{formatCount(annotator.in_progress)}</td>
                  <td className="admin-table__num">{formatCount(annotator.finished)}</td>
                  <td className="admin-table__num">{formatCount(annotator.annotations)}</td>
                  <td className="admin-table__num">{formatCount(annotator.annotations_last_7_days)}</td>
                  <td className="admin-table__num">
                    {hotspotsTouched > 0 ? formatDecimal(annotator.annotations / hotspotsTouched, 1) : '—'}
                  </td>
                  <td className="admin-table__num">{formatCount(annotator.verdicts)}</td>
                  <td className="admin-table__muted">
                    {annotator.last_active_at ? formatDateTime(annotator.last_active_at) : '—'}
                  </td>
                </tr>
              );
            })}
            {stats.annotators.length === 0 && (
              <tr className="admin-table__empty">
                <td colSpan={9}>Brak anotatorów.</td>
              </tr>
            )}
          </tbody>
        </table>
        {stats.unattributed_annotations > 0 && (
          <p className="stats-footnote">
            {formatCount(stats.unattributed_annotations)} anotacji nie ma przypisanego autora (narysowane przed
            wprowadzeniem śledzenia autorów lub przez usunięte konta) i nie są wliczane do obciążenia.
          </p>
        )}
      </Card>
    </div>
  );
}

const sumOf = (stats: Stats, field: 'in_progress' | 'finished'): number =>
  stats.annotators.reduce((sum, annotator) => sum + annotator[field], 0);

/** Hotspots per core tag of the dimension, plus those without a verdict in it yet. */
function verdictSegments(stats: Stats, dimension: TagDimension, totalHotspots: number): Segment[] {
  const tags = stats.tags.filter((tag) => tag.dimension === dimension);
  const assessed = tags.reduce((sum, tag) => sum + tag.hotspots, 0);
  return [
    ...tags.map((tag, index) => ({
      key: String(tag.id),
      label: tag.name,
      value: tag.hotspots,
      color: VERDICT_COLORS[index % VERDICT_COLORS.length],
    })),
    { key: 'none', label: 'Brak oceny', value: Math.max(totalHotspots - assessed, 0), color: 'gray' as const },
  ];
}

interface StatTileProps {
  label: string;
  value: string;
  note?: string;
  /** A swatch tying the tile to the same measure in the charts. */
  color?: SeriesColor;
  emphasis?: boolean;
}

function StatTile({ label, value, note, color, emphasis }: StatTileProps) {
  return (
    <div className={`stats-tile${emphasis ? ' stats-tile--emphasis' : ''}`}>
      <span className="stats-tile__label">
        {color && <span className={`viz-swatch viz-swatch--${color}`} />}
        {label}
      </span>
      <span className="stats-tile__value">{value}</span>
      {note && <span className="stats-tile__note">{note}</span>}
    </div>
  );
}

interface CardProps {
  title: string;
  subtitle?: string;
  /** Content runs edge to edge (a table). */
  flush?: boolean;
  children: ReactNode;
}

function Card({ title, subtitle, flush, children }: CardProps) {
  return (
    <section className={`stats-card${flush ? ' stats-card--flush' : ''}`}>
      <header className="stats-card__header">
        <h2 className="stats-card__title">{title}</h2>
        {subtitle && <p className="stats-card__subtitle">{subtitle}</p>}
      </header>
      <div className="stats-card__body">{children}</div>
    </section>
  );
}
