import './DatePicker.css';

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  min?: string;
  max?: string;
}

export default function DatePicker({
  label,
  error,
  id,
  min,
  max,
  className = '',
  ...props
}: DatePickerProps) {
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
        type="date"
        min={min}
        max={max}
        className={`field__input datepicker__input ${error ? 'field__input--error' : ''}`}
        {...props}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
