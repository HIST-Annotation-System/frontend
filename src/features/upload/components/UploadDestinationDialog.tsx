import { useState } from 'react';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import type { OrganizationRef } from '../../../types/organization';
import type { UploadDestination } from '../../../types/upload';
import './UploadDestinationDialog.css';

interface UploadDestinationDialogProps {
  open: boolean;
  organizations: OrganizationRef[];
  /** Preselected: the organization the library is filtered to, or global. */
  initial: Exclude<UploadDestination, null>;
  /** Files already dropped on the page; without them, confirming opens the file picker. */
  fileCount: number;
  onConfirm: (destination: Exclude<UploadDestination, null>) => void;
  onClose: () => void;
}

/** The system admin's choice of where new slides go: one organization, or every organization (global). */
export default function UploadDestinationDialog({
  open,
  organizations,
  initial,
  fileCount,
  onConfirm,
  onClose,
}: UploadDestinationDialogProps) {
  const [destination, setDestination] = useState(initial);
  const isGlobal = destination === 'global';
  const organizationId = typeof destination === 'number' ? destination : (organizations[0]?.id ?? null);

  return (
    <Modal title="Wgraj slajdy" open={open} onClose={onClose}>
      <form
        className="upload-destination"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(destination);
        }}
      >
        <fieldset className="upload-destination__options">
          <legend className="label-caps">Dla kogo</legend>
          <label className="upload-destination__option">
            <input
              type="radio"
              name="upload-destination"
              checked={!isGlobal}
              disabled={organizationId === null}
              onChange={() => organizationId !== null && setDestination(organizationId)}
            />
            <span>
              <strong>Jedna organizacja</strong>
              <span className="upload-destination__hint">Slajd widzą tylko członkowie wybranej organizacji.</span>
            </span>
          </label>
          {!isGlobal && organizationId !== null && (
            <select
              className="upload-destination__select"
              aria-label="Organizacja"
              value={organizationId}
              onChange={(event) => setDestination(Number(event.target.value))}
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          )}
          <label className="upload-destination__option">
            <input
              type="radio"
              name="upload-destination"
              checked={isGlobal}
              onChange={() => setDestination('global')}
            />
            <span>
              <strong>Globalnie</strong>
              <span className="upload-destination__hint">
                Slajd widzą wszystkie organizacje; zmienić nazwę lub usunąć go może tylko administrator systemu.
              </span>
            </span>
          </label>
        </fieldset>
        <div className="upload-destination__actions">
          <Button onClick={onClose}>Anuluj</Button>
          <Button type="submit" variant="primary">
            {fileCount > 0 ? `Wgraj (${fileCount.toLocaleString('pl-PL')})` : 'Wybierz pliki…'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
