import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './DatePicker.css';
import IconButton from './IconButton';
import Button from './Button';

interface DatePickerProps {
  value?: string; // 'YYYY-MM-DD'
  onChange?: (val: string) => void;
  label?: string;
  error?: string;
}

const PICKER_OPENING_MS = 200;

const YEARS = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());
const MONTHS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

export default function DatePicker({ value, onChange, label, error }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [selectedYear, setYear] = useState('');
  const [selectedMonth, setMonth] = useState('');
  const [selectedDay, setDay] = useState('');


  useEffect(() => {
    if (isOpen) {
      const date = value ? new Date(value) : new Date();
      const safeDate = isNaN(date.getTime()) ? new Date() : date;
      setYear(safeDate.getFullYear().toString());
      setMonth((safeDate.getMonth() + 1).toString().padStart(2, '0'));
      setDay(safeDate.getDate().toString().padStart(2, '0'));
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) {
      setIsOpening(false);
      return;
    }

    setIsOpening(true);
    const timeout = window.setTimeout(() => {
      setIsOpening(false);
    }, PICKER_OPENING_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isOpen]);

  const daysInMonth = getDaysInMonth(parseInt(selectedYear || '2024'), parseInt(selectedMonth || '01'));
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'year' | 'month' | 'day') => {
    const el = e.currentTarget;
    const scrollPos = el.scrollTop;
    const index = Math.round(scrollPos / 44); // 44 is item height
    
    if (type === 'year') setYear(YEARS[index] || selectedYear);
    else if (type === 'month') setMonth(MONTHS[index] || selectedMonth);
    else setDay(DAYS[index] || selectedDay);
  };

  const handleConfirm = () => {
    let finalDay = selectedDay;
    if (parseInt(selectedDay) > daysInMonth) {
      finalDay = daysInMonth.toString().padStart(2, '0');
    }
    const val = `${selectedYear}-${selectedMonth}-${finalDay}`;
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
        <span className="picker-input__text">{value || 'Select Date'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </button>
      {error && <span className="field__error">{error}</span>}

      {typeof document !== 'undefined' && createPortal(
        <div
          className="picker-overlay"
          data-state={isOpen ? 'open' : 'closed'}
          data-opening={isOpening ? 'true' : 'false'}
          onClick={() => setIsOpen(false)}
        >
          <div className="picker-modal" onClick={(event) => event.stopPropagation()}>
            <div className="picker-modal__header">
              <h3 className="picker-modal__title">Select Date</h3>
              <IconButton icon={closeIcon} onClick={() => setIsOpen(false)} variant="dark" />
            </div>

            <div className="picker-wheels">
              <Wheel 
                label="YEAR" 
                items={YEARS} 
                selected={selectedYear} 
                onScroll={(e) => handleScroll(e, 'year')} 
              />
              <Wheel 
                label="MONTH" 
                items={MONTHS} 
                selected={selectedMonth} 
                onScroll={(e) => handleScroll(e, 'month')} 
              />
              <Wheel 
                label="DAY" 
                items={DAYS} 
                selected={selectedDay} 
                onScroll={(e) => handleScroll(e, 'day')} 
              />
            </div>

            <Button variant="primary" fullWidth size="lg" onClick={handleConfirm} className="picker-modal__confirm">
              Confirm
            </Button>
          </div>
        </div>,
        document.body
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
