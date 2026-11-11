/** An annotator's own work on a hotspot: still being edited, or confirmed (and counted in the agreement). */
export type ReannotationStatus = 'draft' | 'confirmed';

/** What an organization's threshold applies to. */
export type AgreementMetric = 'kappa' | 'iou';

/** Where a hotspot's reannotation stands, as everyone sees it (listed with every hotspot). */
export interface ReannotationSummary {
  /** false: annotated in the old shared way and marked reannotated by hand. */
  layered: boolean;
  /** The viewer's own status; null until they start. */
  my_status: ReannotationStatus | null;
  started_count: number;
  confirmed_count: number;
  /** What the figures were judged against; all null while too few annotators have confirmed. */
  metric: AgreementMetric | null;
  threshold: number | null;
  kappa: number | null;
  iou: number | null;
}

export interface Participant {
  account_id: number;
  username: string;
  full_name: string | null;
  status: ReannotationStatus;
  confirmed_at: string | null;
}

/** What an annotator did to the model's cells. */
export type ChangeKind = 'unchanged' | 'reshaped' | 'relabeled' | 'removed' | 'added';

export interface AnnotatorFigures {
  account_id: number;
  username: string;
  full_name: string | null;
  /** The group's figures without this annotator. */
  kappa_without: number;
  iou_without: number;
  /** Their mean IoU with the others. */
  iou_with_rest: number;
  /** Ids of their own cells; for `removed`, ids of the model's cells. */
  changes: Record<ChangeKind, string[]>;
}

export interface Agreement extends ReannotationSummary {
  min_confirmed: number;
  ready: boolean;
  participants: Participant[];
  /** Each confirmed annotator's figures; null for annotators (they see the group, not each colleague). */
  annotators: AnnotatorFigures[] | null;
}

export interface AgreementSettings {
  metric: AgreementMetric;
  threshold: number;
}
