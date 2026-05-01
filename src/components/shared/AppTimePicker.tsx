import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AppTimePickerProps {
  value: string; // 'HH:MM'
  onChange: (val: string) => void;
  label?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
const PICKER_PORTAL_Z_INDEX = 1300;

export default function AppTimePicker({ value, onChange, label }: AppTimePickerProps) {
  const [visible, setVisible] = useState(false);

  const [selectedHour, setHour] = useState(value?.split(':')[0] || '08');
  const [selectedMinute, setMinute] = useState(value?.split(':')[1] || '00');

  useEffect(() => {
    if (value) {
      setHour(value.split(':')[0] || '08');
      setMinute(value.split(':')[1] || '00');
    }
  }, [value]);

  const handleSave = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    setVisible(false);
  };

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && <label style={{ color: '#888', fontSize: '12px', fontWeight: '600' }}>{label}</label>}
        <div
          onClick={() => setVisible(true)}
          style={{
            backgroundColor: '#1A1A1A',
            borderRadius: '12px',
            padding: '14px',
            border: visible ? '1px solid #FFD700' : '1px solid #333',
            color: '#FFF',
            fontSize: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease',
          }}
        >
          <span>{value || 'Select Time'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={visible ? '#FFD700' : '#666'} strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
      </div>

      {visible && createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: PICKER_PORTAL_Z_INDEX,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
          onClick={() => setVisible(false)}
        >
          <div
            style={{
              width: '300px', backgroundColor: '#1A1A1A', borderRadius: '24px',
              padding: '24px', border: '1px solid #333'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ color: '#FFF', fontSize: '18px', fontWeight: '700', margin: 0 }}>Select Time</h3>
              <button
                onClick={() => setVisible(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', alignItems: 'center' }}>
              <Wheel label="HOUR" options={HOURS} selected={selectedHour} onSelect={setHour} />
              <span style={{ color: '#FFD700', fontSize: '24px', fontWeight: '800', marginTop: '24px' }}>:</span>
              <Wheel label="MINUTE" options={MINUTES} selected={selectedMinute} onSelect={setMinute} />
            </div>

            <button
              onClick={handleSave}
              style={{
                width: '100%', backgroundColor: '#FFD700', padding: '14px',
                borderRadius: '12px', border: 'none', color: '#000',
                fontWeight: '800', fontSize: '16px', marginTop: '24px', cursor: 'pointer'
              }}
            >
              Confirm
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function Wheel({ label, options, selected, onSelect }: { label: string, options: string[], selected: string, onSelect: (v: string) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 44;

  useEffect(() => {
    if (listRef.current) {
      const idx = options.indexOf(selected);
      if (idx !== -1) {
        listRef.current.scrollTop = idx * ITEM_HEIGHT;
      }
    }
  }, [options]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const idx = Math.round(scrollTop / ITEM_HEIGHT);
    if (options[idx] && options[idx] !== selected) {
      onSelect(options[idx]);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{ color: '#444', fontSize: '10px', fontWeight: '800', marginBottom: '12px', letterSpacing: '1px' }}>{label}</span>
      <div 
        ref={listRef}
        onScroll={handleScroll}
        style={{ 
          height: `${ITEM_HEIGHT * 3}px`, 
          width: '80px', 
          overflowY: 'auto', 
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'relative'
        }}
      >
        <div style={{ height: `${ITEM_HEIGHT}px` }} /> {/* Top spacer */}
        {options.map(opt => (
          <div 
            key={opt}
            style={{ 
              height: `${ITEM_HEIGHT}px`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              scrollSnapAlign: 'center',
              cursor: 'pointer'
            }}
          >
            <div 
              style={{ 
                width: '100%', 
                height: '36px', 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: selected === opt ? '#332200' : 'transparent',
                transition: 'background-color 0.2s'
              }}
            >
              <span style={{ 
                color: selected === opt ? '#FFD700' : '#666', 
                fontSize: '18px', 
                fontWeight: selected === opt ? '800' : '600' 
              }}>
                {opt}
              </span>
            </div>
          </div>
        ))}
        <div style={{ height: `${ITEM_HEIGHT}px` }} /> {/* Bottom spacer */}
      </div>
    </div>
  );
}
