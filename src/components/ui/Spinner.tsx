import './Spinner.css';

interface SpinnerProps {
  label?: string;
}

export default function Spinner({ label = 'Ładowanie…' }: SpinnerProps) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__circle" aria-hidden="true" />
      <span className="spinner__label">{label}</span>
    </div>
  );
}
