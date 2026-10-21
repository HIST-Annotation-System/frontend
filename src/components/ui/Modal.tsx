import { useEffect, useRef, type ReactNode } from 'react';
import './Modal.css';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, open, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal__header">
        <h2 className="modal__title">{title}</h2>
        <button type="button" className="modal__close" aria-label="Zamknij" onClick={() => ref.current?.close()}>
          ×
        </button>
      </div>
      <div className="modal__body">{children}</div>
    </dialog>
  );
}
