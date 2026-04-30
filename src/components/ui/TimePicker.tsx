import { useState, useEffect, useRef } from 'react';
import './TimePicker.css';
import IconButton from './IconButton';
import Button from './Button';

interface TimePickerProps {
  value?: string; // 'HH:MM'
  onChange?: (val: string) => void;
  label?: string;
  error?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export default function TimePicker({ value, onChange, label, error }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setHour] = useState('05');
  const [selectedMinute, setMinute] = useState('00');

  useEffect(() => {
    if (isOpen) {
      if (value) {
        const [h, m] = value.split(':');
        setHour(h || '05');
        setMinute(m || '00');
      }
    }
  }, [isOpen, value]);


  // Fixed handleScroll for TimePicker
  const handleTimeScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hour' | 'minute') => {
    const el = e.currentTarget;
    const scrollPos = el.scrollTop;
    const index = Math.round(scrollPos / 44);
    
    if (type === 'hour') setHour(HOURS[index] || selectedHour);
    else setMinute(MINUTES[index] || selectedMinute);
  };

  const handleConfirm = () => {
    const val = `${selectedHour}:${selectedMinute}`;
    onChange?.(val);
    setIsOpen(false);
  };

  const closeIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  return (
    <div className="picker-field">
      {label && <label className="field__label">{label}</label>}
      <button 
        type="button" 
        className={`picker-input ${error ? 'picker-input--error' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <span className="picker-input__text">{value || 'Select Time'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </button>
      {error && <span className="field__error">{error}</span>}

      {isOpen && (
        <div className="picker-overlay">
          <div className="picker-modal">
            <div className="picker-modal__header">
              <h3 className="picker-modal__title">Select Time</h3>
              <IconButton icon={closeIcon} onClick={() => setIsOpen(false)} variant="dark" />
            </div>

            <div className="picker-wheels picker-wheels--time">
              <Wheel 
                label="HOUR" 
                items={HOURS} 
                selected={selectedHour} 
                onScroll={(e) => handleTimeScroll(e, 'hour')} 
              />
              <div className="picker-colon">:</div>
              <Wheel 
                label="MINUTE" 
                items={MINUTES} 
                selected={selectedMinute} 
                onScroll={(e) => handleTimeScroll(e, 'minute')} 
              />
            </div>

            <Button variant="primary" fullWidth size="lg" onClick={handleConfirm} className="picker-modal__confirm">
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Wheel({ label, items, selected, onScroll }: { label: string, items: string[], selected: string, onScroll: (e: React.UIEvent<HTMLDivElement>) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const index = items.indexOf(selected);
      if (index !== -1) {
        containerRef.current.scrollTop = index * 44;
      }
    }
  }, [items, selected]);

  return (
    <div className="wheel-container">
      <span className="wheel-label">{label}</span>
      <div className="wheel-viewport" ref={containerRef} onScroll={onScroll}>
        <div className="wheel-padding" />
        {items.map(item => (
          <div key={item} className={`wheel-item ${selected === item ? 'wheel-item--selected' : ''}`}>
            {item}
          </div>
        ))}
        <div className="wheel-padding" />
      </div>
    </div>
  );
}
