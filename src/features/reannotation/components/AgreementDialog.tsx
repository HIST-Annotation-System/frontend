import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import ErrorMessage from '../../../components/ui/ErrorMessage';
import Button from '../../../components/ui/Button';
import type { AnnotatorFigures } from '../../../types/reannotation';
import { getErrorMessage } from '../../../utils/errors';
import { useAgreement } from '../hooks/useReannotation';
import { CHANGE_LABELS, confirmedLabel, formatFigure, gatingValue, METRIC_LABELS } from '../utils/reannotation';
import './Reannotation.css';

interface AgreementDialogProps {
  hotspotId: string;
  hotspotName: string;
  open: boolean;
  onClose: () => void;
  /** Shows an annotator's changes on the image; left out where there is no image (the catalogue). */
  onShowTrace?: (annotator: AnnotatorFigures) => void;
}

const nameOf = ({ full_name, username }: { full_name: string | null; username: string }) => full_name ?? username;

/** Everything about how a hotspot's annotators agree; each annotator's own figures are for administrators only. */
export default function AgreementDialog({ hotspotId, hotspotName, open, onClose, onShowTrace }: AgreementDialogProps) {
  const { data, isPending, isError, error } = useAgreement(hotspotId, open);

  let body;
  if (isPending) body = <Spinner label="Wczytywanie zgodności…" />;
  else if (isError) body = <ErrorMessage message={getErrorMessage(error, 'Nie udało się wczytać zgodności.')} />;
  else {
    const gate = gatingValue(data);
    const figures: { key: 'kappa' | 'iou'; value: number | null }[] = [
      { key: 'kappa', value: data.kappa },
      { key: 'iou', value: data.iou },
    ];
    body = (
      <>
        <dl className="agreement-facts">
          <dt>Zatwierdziło</dt>
          <dd>{confirmedLabel(data.confirmed_count)}</dd>
          {figures.map(({ key, value }) => (
            <div key={key} className="agreement-facts__row">
              <dt>
                {METRIC_LABELS[key]}
                {data.metric === key && <span className="agreement-facts__gate"> (decyduje)</span>}
              </dt>
              <dd>{formatFigure(value)}</dd>
            </div>
          ))}
          <dt>Próg T</dt>
          <dd>
            {formatFigure(data.threshold)}
            {data.metric !== null && gate !== null && data.threshold !== null && (
              <span className="agreement-facts__gate">
                {' '}
                · {gate >= data.threshold ? 'osiągnięty' : 'nieosiągnięty'}
              </span>
            )}
          </dd>
          <dt>Stan</dt>
          <dd>{data.ready ? 'W pełni poprawione' : 'Jeszcze nie poprawione'}</dd>
        </dl>

        <h3 className="agreement-heading">Anotatorzy</h3>
        <ul className="agreement-participants">
          {data.participants.map((item) => (
            <li key={item.account_id}>
              <span>{nameOf(item)}</span>
              <span className="agreement-participants__status">
                {item.status === 'confirmed' ? 'zatwierdził' : 'w trakcie'}
              </span>
            </li>
          ))}
          {data.participants.length === 0 && <li className="agreement-participants__empty">Nikt jeszcze nie zaczął.</li>}
        </ul>

        {data.annotators && data.annotators.length > 0 && (
          <>
            <h3 className="agreement-heading">Wkład każdego</h3>
            <div className="agreement-table-wrap">
              <table className="agreement-table">
                <thead>
                  <tr>
                    <th>Anotator</th>
                    <th title="Zgodność grupy bez tej osoby">κ bez</th>
                    <th title="Zgodność grupy bez tej osoby">IoU bez</th>
                    <th title="Średnie IoU z pozostałymi">IoU z resztą</th>
                    <th>Zmiany względem modelu</th>
                    {onShowTrace && <th />}
                  </tr>
                </thead>
                <tbody>
                  {data.annotators.map((annotator) => (
                    <tr key={annotator.account_id}>
                      <td>{nameOf(annotator)}</td>
                      <td className="mono-data">{formatFigure(annotator.kappa_without)}</td>
                      <td className="mono-data">{formatFigure(annotator.iou_without)}</td>
                      <td className="mono-data">{formatFigure(annotator.iou_with_rest)}</td>
                      <td className="agreement-table__changes">
                        {(Object.keys(CHANGE_LABELS) as (keyof typeof CHANGE_LABELS)[])
                          .filter((kind) => annotator.changes[kind].length > 0)
                          .map((kind) => `${CHANGE_LABELS[kind]}: ${annotator.changes[kind].length}`)
                          .join(' · ') || '—'}
                      </td>
                      {onShowTrace && (
                        <td>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              onShowTrace(annotator);
                              onClose();
                            }}
                          >
                            Pokaż na obrazie
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <Modal title={`Zgodność: ${hotspotName}`} open={open} onClose={onClose} className="agreement-dialog">
      {body}
    </Modal>
  );
}
