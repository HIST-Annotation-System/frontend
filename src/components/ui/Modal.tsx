import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import Button from './Button';
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
        <Button variant="ghost" icon={<X size={16} />} aria-label="Zamknij" onClick={() => ref.current?.close()} />
      </div>
      <div className="modal__body">{children}</div>
    </dialog>
  );
}
