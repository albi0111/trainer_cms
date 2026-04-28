import './TimePicker.css';

interface TimePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function TimePicker({
  label,
  error,
  id,
  className = '',
  ...props
}: TimePickerProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="time"
        className={`field__input timepicker__input ${error ? 'field__input--error' : ''}`}
        {...props}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
