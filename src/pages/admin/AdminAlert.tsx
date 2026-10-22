import { X } from 'lucide-react';

interface AdminAlertProps {
  message: string;
  onDismiss: () => void;
}

export default function AdminAlert({ message, onDismiss }: AdminAlertProps) {
  return (
    <div className="admin-alert" role="alert">
      <span>{message}</span>
      <button type="button" className="admin-alert__dismiss" title="Zamknij" aria-label="Zamknij" onClick={onDismiss}>
        <X size={14} />
      </button>
    </div>
  );
}
