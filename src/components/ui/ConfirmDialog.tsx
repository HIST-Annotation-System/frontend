import type { ReactNode } from 'react';
import Button from './Button';
import Modal from './Modal';

interface ConfirmDialogProps {
  title: string;
  open: boolean;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/** A yes/no question before something destructive (in place of the browser's confirm()). */
export default function ConfirmDialog({ title, open, confirmLabel, busy, onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <p>{children}</p>
      <div className="modal-actions">
        <Button onClick={onCancel} disabled={busy}>
          Wróć
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
