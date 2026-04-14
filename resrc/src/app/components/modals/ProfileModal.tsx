import React, { useState } from 'react';
import { X, Edit2, Check, User, MessageSquare, Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp, Client, ClientStatus } from '../../context/AppContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
}

const GOALS = [
  'Build Muscle Mass', 'Weight Loss & Tone', 'Athletic Performance',
  'Tone & Flexibility', 'Rehabilitation & Strength', 'General Fitness',
];

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

const infoRow = (label: string, value: string, t: any) => (
  <div style={{ marginBottom: '12px' }}>
    <span style={{ fontSize: '11px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    <p style={{ fontSize: '14px', color: t.text, marginTop: '3px' }}>{value || '—'}</p>
  </div>
);

type EditSection = 'personal' | 'interview' | 'assessment' | null;

export function ProfileModal({ isOpen, onClose, clientId }: ProfileModalProps) {
  const { t } = useTheme();
  const { getClient, updateClient } = useApp();
  const client = getClient(clientId);
  const [editSection, setEditSection] = useState<EditSection>(null);
  const [editData, setEditData] = useState<Partial<Client>>({});

  if (!isOpen || !client) return null;

  const startEdit = (section: EditSection) => {
    setEditData({ ...client });
    setEditSection(section);
  };

  const saveEdit = () => {
    updateClient(clientId, editData);
    setEditSection(null);
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const statusColors: Record<ClientStatus, string> = {
    active: t.success, inactive: t.textMuted, 'on-hold': t.warning,
  };

  if (editSection) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        onClick={() => setEditSection(null)}>
        <div style={{ background: t.bgCard, borderRadius: '20px', border: `1px solid ${t.border}`, boxShadow: `0 24px 64px ${t.shadow}`, width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: t.text }}>
              Edit {editSection === 'personal' ? 'Personal Info' : editSection === 'interview' ? 'Interview' : 'Assessment'}
            </span>
            <button onClick={() => setEditSection(null)} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ padding: '20px 24px' }}>
            {editSection === 'personal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle(t)}>Full Name</label>
                  <input style={inputStyle(t)} value={editData.name || ''} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle(t)}>Age</label>
                    <input style={inputStyle(t)} type="number" value={editData.age || ''} onChange={e => setEditData(d => ({ ...d, age: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label style={labelStyle(t)}>Gender</label>
                    <select style={{ ...inputStyle(t), appearance: 'none' }} value={editData.gender || ''} onChange={e => setEditData(d => ({ ...d, gender: e.target.value }))}>
                      <option>Male</option><option>Female</option><option>Non-binary</option><option>Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle(t)}>Phone</label>
                  <input style={inputStyle(t)} value={editData.phone || ''} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle(t)}>Email</label>
                  <input style={inputStyle(t)} type="email" value={editData.email || ''} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle(t)}>Status</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['active', 'on-hold', 'inactive'] as ClientStatus[]).map(s => (
                      <button key={s} onClick={() => setEditData(d => ({ ...d, status: s }))}
                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1.5px solid ${editData.status === s ? t.accent : t.border}`, background: editData.status === s ? t.accent : t.bgInput, color: editData.status === s ? t.accentFg : t.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {editSection === 'interview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle(t)}>Training Experience</label>
                  <textarea style={{ ...inputStyle(t), minHeight: '80px', resize: 'vertical' }} value={editData.experience || ''} onChange={e => setEditData(d => ({ ...d, experience: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle(t)}>Injuries / Medical Conditions</label>
                  <textarea style={{ ...inputStyle(t), minHeight: '80px', resize: 'vertical' }} value={editData.injuries || ''} onChange={e => setEditData(d => ({ ...d, injuries: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle(t)}>Lifestyle Notes</label>
                  <textarea style={{ ...inputStyle(t), minHeight: '80px', resize: 'vertical' }} value={editData.lifestyle || ''} onChange={e => setEditData(d => ({ ...d, lifestyle: e.target.value }))} />
                </div>
              </div>
            )}
            {editSection === 'assessment' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle(t)}>Weight (kg)</label>
                    <input style={inputStyle(t)} type="number" value={editData.weight || ''} onChange={e => setEditData(d => ({ ...d, weight: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label style={labelStyle(t)}>Height (cm)</label>
                    <input style={inputStyle(t)} type="number" value={editData.height || ''} onChange={e => setEditData(d => ({ ...d, height: parseFloat(e.target.value) || 0 }))} />
                  </div>
                  <div>
                    <label style={labelStyle(t)}>Target (kg)</label>
                    <input style={inputStyle(t)} type="number" value={editData.targetWeight || ''} onChange={e => setEditData(d => ({ ...d, targetWeight: parseFloat(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle(t)}>Primary Goal</label>
                  <select style={{ ...inputStyle(t), appearance: 'none' }} value={editData.goal || ''} onChange={e => setEditData(d => ({ ...d, goal: e.target.value }))}>
                    {GOALS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: '12px' }}>
            <button onClick={() => setEditSection(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
              Cancel
            </button>
            <button onClick={saveEdit} style={{ flex: 2, padding: '12px', borderRadius: '10px', background: t.accent, color: t.accentFg, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Check size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}>
      <div style={{ background: t.bgCard, borderRadius: '20px', border: `1px solid ${t.border}`, boxShadow: `0 24px 64px ${t.shadow}`, width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        {/* Profile Header */}
        <div style={{ padding: '24px', background: `linear-gradient(135deg, ${t.accent}22, ${t.accent}08)`, borderRadius: '20px 20px 0 0', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: t.accentFg }}>
                {getInitials(client.name)}
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: t.text, margin: '0 0 4px' }}>{client.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: t.textMuted }}>{client.goal}</span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: t.textSubtle }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: statusColors[client.status], textTransform: 'capitalize' }}>{client.status}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Sections */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '0' }}>
          {/* Personal */}
          <section style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={14} color={t.accent} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personal Info</span>
              </div>
              <button onClick={() => startEdit('personal')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                <Edit2 size={11} /> Edit
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
              {infoRow('Age', client.age ? `${client.age} years` : '—', t)}
              {infoRow('Gender', client.gender, t)}
              {infoRow('Phone', client.phone, t)}
              {infoRow('Email', client.email, t)}
            </div>
          </section>

          {/* Interview */}
          <section style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={14} color={t.accent} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Interview</span>
              </div>
              <button onClick={() => startEdit('interview')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                <Edit2 size={11} /> Edit
              </button>
            </div>
            {infoRow('Experience', client.experience, t)}
            {infoRow('Injuries / Conditions', client.injuries, t)}
            {infoRow('Lifestyle', client.lifestyle, t)}
          </section>

          {/* Assessment */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} color={t.accent} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assessment</span>
              </div>
              <button onClick={() => startEdit('assessment')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                <Edit2 size={11} /> Edit
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
              {infoRow('Weight', client.weight ? `${client.weight} kg` : '—', t)}
              {infoRow('Height', client.height ? `${client.height} cm` : '—', t)}
              {infoRow('Target', client.targetWeight ? `${client.targetWeight} kg` : '—', t)}
            </div>
            {infoRow('Primary Goal', client.goal, t)}
            {infoRow('Member Since', client.createdAt, t)}
          </section>
        </div>
      </div>
    </div>
  );
}
