import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

const inputStyle = (t: any) => ({
  width: '100%', padding: '10px 14px',
  background: t.bgInput, border: `1px solid ${t.border}`,
  borderRadius: '8px', color: t.text, fontSize: '14px',
  outline: 'none', boxSizing: 'border-box' as const,
  fontFamily: 'Inter, sans-serif',
});

const labelStyle = (t: any) => ({
  display: 'block', fontSize: '11px', fontWeight: 600,
  textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  color: t.textMuted, marginBottom: '6px',
});

export function ProgressModal({ isOpen, onClose, clientId }: ProgressModalProps) {
  const { t } = useTheme();
  const { addProgress } = useApp();
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFat: '',
    notes: '',
  });

  const handleSave = () => {
    if (!form.weight) return;
    addProgress(clientId, {
      date: form.date,
      weight: parseFloat(form.weight),
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : undefined,
      notes: form.notes,
    });
    setForm({ date: new Date().toISOString().split('T')[0], weight: '', bodyFat: '', notes: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: t.bgCard, borderRadius: '20px', border: `1px solid ${t.border}`, boxShadow: `0 24px 64px ${t.shadow}`, width: '100%', maxWidth: '400px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>Log Progress</span>
          <button onClick={onClose} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle(t)}>Date</label>
            <input style={inputStyle(t)} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle(t)}>Weight (kg) *</label>
              <input style={inputStyle(t)} type="number" step="0.1" placeholder="78.5" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle(t)}>Body Fat %</label>
              <input style={inputStyle(t)} type="number" step="0.1" placeholder="18.5" value={form.bodyFat} onChange={e => setForm(f => ({ ...f, bodyFat: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={labelStyle(t)}>Notes</label>
            <textarea style={{ ...inputStyle(t), minHeight: '60px', resize: 'vertical' }} placeholder="Observations, how client felt..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.weight} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: form.weight ? t.accent : t.border, color: form.weight ? t.accentFg : t.textMuted, border: 'none', cursor: form.weight ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={16} /> Log Entry
          </button>
        </div>
      </div>
    </div>
  );
}
