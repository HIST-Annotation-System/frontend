import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import './Hotspots.css';

interface HotspotDeleteModalProps {
  name: string;
  open: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Asks before deleting a hotspot (from the browse table or the details panel). */
export default function HotspotDeleteModal({ name, open, isDeleting, onConfirm, onClose }: HotspotDeleteModalProps) {
  return (
    <Modal title="Usuń hotspot" open={open} onClose={onClose}>
      <p>
        Czy na pewno chcesz usunąć hotspot „{name}”? Obraz oraz wszystkie jego anotacje zostaną trwale usunięte. Slajd
        źródłowy pozostaje bez zmian.
      </p>
      <div className="hotspot-form__actions">
        <Button onClick={onClose} disabled={isDeleting}>
          Wróć
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Usuwanie…' : 'Usuń'}
        </Button>
      </div>
    </Modal>
  );
}
