import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <span className="error-message__text">{message}</span>
      {onDismiss && (
        <button type="button" className="error-message__dismiss" onClick={onDismiss} aria-label="Zamknij komunikat">
          ×
        </button>
      )}
    </div>
  );
}
