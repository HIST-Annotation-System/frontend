import type { ReactNode } from 'react';
import Button from './Button';
import Modal from './Modal';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  open: boolean;
  confirmLabel: string;
  busy?: boolean;
  /** Shown as a red line under the question (e.g. a failed delete). */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/** A yes/no question before something destructive (in place of the browser's confirm()). */
export default function ConfirmDialog({
  title,
  open,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <div className="confirm-dialog">
        <p className="confirm-dialog__question">{children}</p>
        {error && (
          <p className="confirm-dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="confirm-dialog__actions">
          <Button onClick={onCancel} disabled={busy}>
            Wróć
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
