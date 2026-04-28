import './Checkbox.css';

interface CheckboxProps {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

/**
 * Checkbox — matches reference AppCheckbox exactly.
 * 28×28, borderRadius 6, gold when checked, black checkmark icon.
 */
export default function Checkbox({
  label,
  checked,
  onChange,
  id,
  disabled = false,
}: CheckboxProps) {
  const checkId = id ?? `cb-${(label ?? 'check').toLowerCase().replace(/\s+/g, '-')}`;

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
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span className="checkbox__label">{label}</span>}
    </label>
  );
}
