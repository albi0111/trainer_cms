import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp, Session } from '../../context/AppContext';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  session?: Session | null;
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

const SESSION_TYPES = ['Strength', 'HIIT', 'Cardio', 'Performance', 'Rehabilitation', 'Pilates', 'General', 'Assessment'];

export function SessionModal({ isOpen, onClose, clientId, session }: SessionModalProps) {
  const { t } = useTheme();
  const { addSession, updateSession } = useApp();

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration: '60',
    type: 'Strength',
    notes: '',
    completed: false,
  });

  useEffect(() => {
    if (session) {
      setForm({
        date: session.date,
        time: session.time,
        duration: String(session.duration),
        type: session.type,
        notes: session.notes,
        completed: session.completed,
      });
    } else {
      setForm({ date: new Date().toISOString().split('T')[0], time: '09:00', duration: '60', type: 'Strength', notes: '', completed: false });
    }
  }, [session, isOpen]);

  const handleSave = () => {
    const data = {
      date: form.date,
      time: form.time,
      duration: parseInt(form.duration) || 60,
      type: form.type,
      notes: form.notes,
      completed: form.completed,
    };
    if (session) {
      updateSession(clientId, { ...data, id: session.id });
    } else {
      addSession(clientId, data);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: t.bgCard, borderRadius: '20px', border: `1px solid ${t.border}`, boxShadow: `0 24px 64px ${t.shadow}`, width: '100%', maxWidth: '440px' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>{session ? 'Edit Session' : 'Add Session'}</span>
          <button onClick={onClose} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle(t)}>Date</label>
              <input style={inputStyle(t)} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle(t)}>Time</label>
              <input style={inputStyle(t)} type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle(t)}>Type</label>
              <select style={{ ...inputStyle(t), appearance: 'none' }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {SESSION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle(t)}>Duration (min)</label>
              <input style={inputStyle(t)} type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
          </div>
          <div>
            <label style={labelStyle(t)}>Notes</label>
            <textarea style={{ ...inputStyle(t), minHeight: '72px', resize: 'vertical' }} placeholder="Session focus or notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setForm(f => ({ ...f, completed: !f.completed }))}
              style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${form.completed ? t.accent : t.border}`, background: form.completed ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              {form.completed && <Check size={12} color={t.accentFg} />}
            </button>
            <span style={{ fontSize: '14px', color: t.text }}>Mark as completed</span>
          </div>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: t.accent, color: t.accentFg, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={16} /> {session ? 'Update' : 'Add'} Session
          </button>
        </div>
      </div>
    </div>
  );
}
