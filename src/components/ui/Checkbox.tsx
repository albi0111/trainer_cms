import './Checkbox.css';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export default function Checkbox({
  label,
  checked,
  onChange,
  id,
  disabled = false,
}: CheckboxProps) {
  const checkId = id ?? `cb-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <label className={`checkbox ${disabled ? 'checkbox--disabled' : ''}`} htmlFor={checkId}>
      <input
        id={checkId}
        type="checkbox"
        className="checkbox__input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="checkbox__box" aria-hidden="true">
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="checkbox__label">{label}</span>
    </label>
  );
}
