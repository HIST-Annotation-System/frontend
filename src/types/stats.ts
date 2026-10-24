import type { HotspotStatus } from './hotspot';
import type { SlideStatus } from './slide';
import type { TagDimension } from './tag';
import type { Role } from './user';

export type HotspotStatusCounts = Record<HotspotStatus, number>;

export interface FolderProgress extends HotspotStatusCounts {
  id: string;
  name: string;
}

export interface AnnotatorLoad {
  account_id: number;
  username: string;
  full_name: string | null;
  role: Role;
  /** Hotspots not marked reannotated yet that hold at least one of the account's annotations. */
  in_progress: number;
  /** Hotspots the account marked reannotated. */
  finished: number;
  annotations: number;
  annotations_last_7_days: number;
  /** Tags (verdicts included) the account put on hotspots. */
  verdicts: number;
  last_active_at: string | null;
}

export interface CellTypeUsage {
  id: number;
  name: string;
  annotations: number;
}

export interface TagUsage {
  id: number;
  name: string;
  dimension: TagDimension | null;
  hotspots: number;
}

export interface DailyActivity {
  /** ISO date (YYYY-MM-DD). */
  day: string;
  annotations: number;
  reannotated: number;
  hotspots_created: number;
}

export interface Stats {
  generated_at: string;
  hotspots: HotspotStatusCounts;
  hotspot_folders: number;
  annotations: number;
  /** Drawn before authors were recorded, or by deleted accounts. */
  unattributed_annotations: number;
  median_hours_to_reannotate: number | null;
  slides: { status: SlideStatus; count: number }[];
  slides_total_bytes: number;
  accounts: { admins: number; annotators: number; pending_first_login: number };
  annotators: AnnotatorLoad[];
  cell_types: CellTypeUsage[];
  tags: TagUsage[];
  folders: FolderProgress[];
  /** One entry per day, oldest first. */
  activity: DailyActivity[];
}
