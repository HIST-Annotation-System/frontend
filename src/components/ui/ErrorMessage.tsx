import { AlertTriangle, X } from 'lucide-react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <span className="error-message__text">{message}</span>
      {onDismiss && (
        <button type="button" className="error-message__dismiss" onClick={onDismiss} aria-label="Zamknij komunikat">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
