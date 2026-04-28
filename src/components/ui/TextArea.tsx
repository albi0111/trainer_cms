import './TextArea.css';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  rows?: number;
}

export default function TextArea({
  label,
  error,
  rows = 4,
  id,
  className = '',
  ...props
}: TextAreaProps) {
  const areaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field__label" htmlFor={areaId}>
          {label}
        </label>
      )}
      <textarea
        id={areaId}
        rows={rows}
        className={`field__input textarea__input ${error ? 'field__input--error' : ''}`}
        {...props}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
