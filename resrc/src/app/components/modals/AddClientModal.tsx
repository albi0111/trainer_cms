import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X, Check, User, MessageSquare, Dumbbell, Activity, Heart, Ruler, Target, StickyNote } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp, ClientStatus } from '../../context/AppContext';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
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

// ── Exercise SVG Icons ──────────────────────────────────────────────────────

const HamstringsIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 44 44" width="34" height="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="21" r="3.5" fill={color} stroke="none" />
    {/* body horizontal */}
    <line x1="11.5" y1="21" x2="30" y2="21" />
    {/* raised leg up */}
    <line x1="30" y1="21" x2="30" y2="7" />
    <line x1="27" y1="7" x2="33" y2="7" />
    {/* bent other leg */}
    <line x1="22" y1="21" x2="24" y2="31" />
    <line x1="24" y1="31" x2="18" y2="34" />
  </svg>
);

const QuadricepsIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 44 44" width="34" height="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="22" cy="5" r="3.5" fill={color} stroke="none" />
    {/* torso */}
    <line x1="22" y1="8.5" x2="22" y2="22" />
    {/* front leg down */}
    <line x1="22" y1="22" x2="15" y2="38" />
    {/* back leg + foot up behind */}
    <line x1="22" y1="22" x2="32" y2="28" />
    <line x1="32" y1="28" x2="38" y2="18" />
    {/* arm reaching back to foot */}
    <line x1="22" y1="15" x2="36" y2="18" />
  </svg>
);

const HipFlexorsIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 44 44" width="34" height="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="20" cy="5" r="3.5" fill={color} stroke="none" />
    {/* torso */}
    <line x1="20" y1="8.5" x2="20" y2="22" />
    {/* front leg lunge */}
    <line x1="20" y1="22" x2="10" y2="36" />
    {/* back leg extended */}
    <line x1="20" y1="22" x2="32" y2="28" />
    <line x1="32" y1="28" x2="38" y2="38" />
    {/* arms balanced */}
    <line x1="20" y1="15" x2="11" y2="10" />
    <line x1="20" y1="15" x2="29" y2="11" />
  </svg>
);

const ShouldersIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 44 44" width="34" height="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="22" cy="7" r="3.5" fill={color} stroke="none" />
    {/* torso */}
    <line x1="22" y1="10.5" x2="22" y2="28" />
    {/* arms raised overhead in V */}
    <line x1="22" y1="17" x2="13" y2="6" />
    <line x1="22" y1="17" x2="31" y2="6" />
    {/* legs */}
    <line x1="22" y1="28" x2="16" y2="40" />
    <line x1="22" y1="28" x2="28" y2="40" />
  </svg>
);

const ToeReachIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 44 44" width="34" height="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="11" r="3.5" fill={color} stroke="none" />
    {/* torso forward lean */}
    <line x1="8" y1="14.5" x2="26" y2="26" />
    {/* legs extended on ground */}
    <line x1="8" y1="20" x2="36" y2="20" />
    {/* foot */}
    <line x1="36" y1="18" x2="36" y2="22" />
    {/* arms reaching to feet */}
    <line x1="26" y1="26" x2="36" y2="20" />
  </svg>
);

const TrunkRotationIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 44 44" width="34" height="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="18" r="3.5" fill={color} stroke="none" />
    {/* body horizontal */}
    <line x1="11.5" y1="18" x2="28" y2="18" />
    {/* arms T-spread */}
    <line x1="16" y1="18" x2="10" y2="10" />
    <line x1="16" y1="18" x2="10" y2="26" />
    {/* knees dropped to right */}
    <line x1="24" y1="18" x2="30" y2="28" />
    <line x1="30" y1="28" x2="38" y2="24" />
    <line x1="30" y1="28" x2="36" y2="34" />
  </svg>
);

const TreadmillIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 44 44" width="34" height="34" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="29" cy="6" r="3.5" fill={color} stroke="none" />
    {/* torso leaning */}
    <line x1="29" y1="9.5" x2="23" y2="21" />
    {/* front leg */}
    <line x1="23" y1="21" x2="15" y2="30" />
    <line x1="15" y1="30" x2="8" y2="27" />
    {/* back leg raised */}
    <line x1="23" y1="21" x2="29" y2="32" />
    <line x1="29" y1="32" x2="37" y2="28" />
    {/* front arm back */}
    <line x1="25" y1="15" x2="15" y2="10" />
    {/* back arm forward */}
    <line x1="25" y1="15" x2="33" y2="22" />
    {/* treadmill platform */}
    <line x1="5" y1="36" x2="39" y2="36" />
    <line x1="5" y1="36" x2="5" y2="40" />
    <line x1="39" y1="36" x2="39" y2="40" />
    <line x1="5" y1="40" x2="39" y2="40" />
  </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────

type FlexKey = 'hamstrings' | 'quadriceps' | 'hipFlexors' | 'shoulders' | 'toeReach' | 'trunkRotation' | 'treadmill';
interface FlexTest { r: boolean; l: boolean; note: string; }

const FLEX_EXERCISES: { key: FlexKey; label: string; Icon: React.FC<{ color: string }> }[] = [
  { key: 'hamstrings',    label: 'Hamstrings',     Icon: HamstringsIcon },
  { key: 'quadriceps',   label: 'Quadriceps',     Icon: QuadricepsIcon },
  { key: 'hipFlexors',   label: 'Hip Flexors',    Icon: HipFlexorsIcon },
  { key: 'shoulders',    label: 'Shoulders',      Icon: ShouldersIcon },
  { key: 'toeReach',     label: 'Toe Reach',      Icon: ToeReachIcon },
  { key: 'trunkRotation',label: 'Trunk Rotation', Icon: TrunkRotationIcon },
  { key: 'treadmill',    label: 'Treadmill',      Icon: TreadmillIcon },
];

const defaultFlex = (): Record<FlexKey, FlexTest> => ({
  hamstrings:     { r: false, l: false, note: '' },
  quadriceps:    { r: false, l: false, note: '' },
  hipFlexors:    { r: false, l: false, note: '' },
  shoulders:     { r: false, l: false, note: '' },
  toeReach:      { r: false, l: false, note: '' },
  trunkRotation: { r: false, l: false, note: '' },
  treadmill:     { r: false, l: false, note: '' },
});

// ── Component ────────────────────────────────────────────────────────────────

export function AddClientModal({ isOpen, onClose, onCreated }: AddClientModalProps) {
  const { t } = useTheme();
  const { addClient } = useApp();
  const [step, setStep] = useState(1);

  const [personal, setPersonal] = useState({ name: '', age: '', gender: 'Male', phone: '', email: '' });
  const [interview, setInterview] = useState({ experience: '', injuries: '', lifestyle: '' });
  const [assessment, setAssessment] = useState({
    weight: '', height: '', goal: GOALS[0], status: 'active' as ClientStatus,
    bp: '', rhr: '', objectives: '',
  });
  const [flexTests, setFlexTests] = useState<Record<FlexKey, FlexTest>>(defaultFlex());
  const [openNotes, setOpenNotes] = useState<Set<FlexKey>>(new Set());
  const [fitTime, setFitTime] = useState('');
  const [fitDistance, setFitDistance] = useState('');
  const [fitMhr, setFitMhr] = useState('');

  const toggleFlex = (key: FlexKey, side: 'r' | 'l') =>
    setFlexTests(p => ({ ...p, [key]: { ...p[key], [side]: !p[key][side] } }));

  const setFlexNote = (key: FlexKey, note: string) =>
    setFlexTests(p => ({ ...p, [key]: { ...p[key], note } }));

  const toggleNote = (key: FlexKey) =>
    setOpenNotes(p => { const s = new Set(p); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const reset = () => {
    setStep(1);
    setPersonal({ name: '', age: '', gender: 'Male', phone: '', email: '' });
    setInterview({ experience: '', injuries: '', lifestyle: '' });
    setAssessment({ weight: '', height: '', goal: GOALS[0], status: 'active', bp: '', rhr: '', objectives: '' });
    setFlexTests(defaultFlex());
    setOpenNotes(new Set());
    setFitTime(''); setFitDistance(''); setFitMhr('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!personal.name.trim()) return;
    const flexLines = FLEX_EXERCISES.map(({ key, label }) => {
      const f = flexTests[key];
      if (!f.r && !f.l && !f.note) return '';
      const sides = [f.r ? 'R ✓' : '', f.l ? 'L ✓' : ''].filter(Boolean).join(' ');
      return `${label}${sides ? ': ' + sides : ''}${f.note ? ' — ' + f.note : ''}`;
    }).filter(Boolean);
    const vitals = [
      assessment.bp ? `BP: ${assessment.bp}` : '',
      assessment.rhr ? `RHR: ${assessment.rhr} bpm` : '',
    ].filter(Boolean);
    const metrics = [
      fitTime ? `Time: ${fitTime} min` : '',
      fitDistance ? `Distance: ${fitDistance}` : '',
      fitMhr ? `MHR: ${fitMhr} bpm` : '',
    ].filter(Boolean);
    const overviewNotes = [
      vitals.length ? `Vitals — ${vitals.join('  |  ')}` : '',
      flexLines.length ? `Fitness Tests:\n${flexLines.join('\n')}` : '',
      metrics.length ? `Metrics — ${metrics.join('  |  ')}` : '',
      assessment.objectives ? `Objectives: ${assessment.objectives}` : '',
    ].filter(Boolean).join('\n\n');

    const id = addClient({
      name: personal.name.trim(),
      age: parseInt(personal.age) || 0,
      gender: personal.gender,
      phone: personal.phone,
      email: personal.email,
      experience: interview.experience,
      injuries: interview.injuries,
      lifestyle: interview.lifestyle,
      weight: parseFloat(assessment.weight) || 0,
      height: parseFloat(assessment.height) || 0,
      targetWeight: 0,
      goal: assessment.goal,
      status: assessment.status,
      overviewNotes,
    });
    reset();
    onCreated(id);
  };

  if (!isOpen) return null;

  const steps = [
    { num: 1, label: 'Personal', icon: User },
    { num: 2, label: 'Interview', icon: MessageSquare },
    { num: 3, label: 'Assessment', icon: Dumbbell },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: t.bgOverlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: t.bgCard, borderRadius: '20px',
          border: `1px solid ${t.border}`,
          boxShadow: `0 24px 64px ${t.shadow}`,
          width: '100%', maxWidth: '520px',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: t.accent, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              NEW CLIENT
            </p>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: t.text, margin: 0 }}>Add Client</h2>
          </div>
          <button onClick={handleClose} style={{ background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: t.textMuted }}>
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ padding: '20px 24px 0', display: 'flex', gap: '8px' }}>
          {steps.map(s => {
            const Icon = s.icon;
            const isDone = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: isDone ? t.accent : isActive ? t.accent : t.bgInput,
                  border: `2px solid ${isDone || isActive ? t.accent : t.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isDone || isActive ? t.accentFg : t.textMuted,
                }}>
                  {isDone ? <Check size={16} /> : <Icon size={15} />}
                </div>
                <div style={{ height: '2px', width: '100%', background: isDone ? t.accent : t.border, borderRadius: '2px' }} />
                <span style={{ fontSize: '10px', fontWeight: 600, color: isActive ? t.accent : t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{ padding: '24px' }}>

          {/* ── Step 1: Personal ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle(t)}>Full Name *</label>
                <input style={inputStyle(t)} placeholder="e.g. John Smith" value={personal.name}
                  onChange={e => setPersonal(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle(t)}>Age</label>
                  <input style={inputStyle(t)} type="number" placeholder="28" value={personal.age}
                    onChange={e => setPersonal(p => ({ ...p, age: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle(t)}>Gender</label>
                  <select style={{ ...inputStyle(t), appearance: 'none' }} value={personal.gender}
                    onChange={e => setPersonal(p => ({ ...p, gender: e.target.value }))}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle(t)}>Phone</label>
                <input style={inputStyle(t)} placeholder="+1 234 567 8901" value={personal.phone}
                  onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle(t)}>Email</label>
                <input style={inputStyle(t)} type="email" placeholder="client@email.com" value={personal.email}
                  onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
          )}

          {/* ── Step 2: Interview ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '12px', color: t.textMuted, marginBottom: '4px', fontStyle: 'italic' }}>
                Optional — helps personalize the program
              </p>
              <div>
                <label style={labelStyle(t)}>Training Experience</label>
                <textarea style={{ ...inputStyle(t), minHeight: '80px', resize: 'vertical' }}
                  placeholder="e.g. 2 years gym experience, mostly self-taught..."
                  value={interview.experience}
                  onChange={e => setInterview(p => ({ ...p, experience: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle(t)}>Injuries / Medical Conditions</label>
                <textarea style={{ ...inputStyle(t), minHeight: '80px', resize: 'vertical' }}
                  placeholder="e.g. Right knee strain, avoid heavy pressing..."
                  value={interview.injuries}
                  onChange={e => setInterview(p => ({ ...p, injuries: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle(t)}>Lifestyle Notes</label>
                <textarea style={{ ...inputStyle(t), minHeight: '80px', resize: 'vertical' }}
                  placeholder="e.g. Desk job, sleeps 6 hrs, high stress..."
                  value={interview.lifestyle}
                  onChange={e => setInterview(p => ({ ...p, lifestyle: e.target.value }))} />
              </div>
            </div>
          )}

          {/* ── Step 3: Assessment ── */}
          {step === 3 && (() => {
            const iconInput = (icon: React.ReactNode, content: React.ReactNode) => (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: t.textMuted, pointerEvents: 'none', display: 'flex' }}>
                  {icon}
                </div>
                {content}
              </div>
            );
            const withIcon = { ...inputStyle(t), paddingLeft: '36px' };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Body Measurements — Weight & Height only */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle(t)}>Weight (kg)</label>
                    {iconInput(<Ruler size={14} />,
                      <input style={withIcon} type="number" placeholder="75" value={assessment.weight}
                        onChange={e => setAssessment(p => ({ ...p, weight: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <label style={labelStyle(t)}>Height (cm)</label>
                    {iconInput(<Ruler size={14} />,
                      <input style={withIcon} type="number" placeholder="175" value={assessment.height}
                        onChange={e => setAssessment(p => ({ ...p, height: e.target.value }))} />
                    )}
                  </div>
                </div>

                {/* Vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle(t)}>BP (mmHg)</label>
                    {iconInput(<Activity size={14} />,
                      <input style={withIcon} placeholder="120/80" value={assessment.bp}
                        onChange={e => setAssessment(p => ({ ...p, bp: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <label style={labelStyle(t)}>RHR (bpm)</label>
                    {iconInput(<Heart size={14} />,
                      <input style={withIcon} type="number" placeholder="65" value={assessment.rhr}
                        onChange={e => setAssessment(p => ({ ...p, rhr: e.target.value }))} />
                    )}
                  </div>
                </div>

                {/* Fitness Tests */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Dumbbell size={13} color={t.accent} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Fitness Tests
                    </span>
                  </div>

                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 28px 28px 28px', gap: '8px', padding: '0 4px 6px', alignItems: 'center' }}>
                    <span />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Exercise</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>R</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>L</span>
                    <span />
                  </div>

                  {/* Exercise rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {FLEX_EXERCISES.map(({ key, label, Icon: ExIcon }) => {
                      const test = flexTests[key];
                      const noteOpen = openNotes.has(key);
                      const hasNote = !!test.note;
                      return (
                        <div key={key}>
                          {/* Main row */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '38px 1fr 28px 28px 28px',
                            gap: '8px',
                            alignItems: 'center',
                            padding: '7px 8px',
                            background: t.bgInput,
                            border: `1px solid ${t.border}`,
                            borderRadius: noteOpen ? '8px 8px 0 0' : '8px',
                            transition: 'border-radius 0.15s',
                          }}>

                            {/* SVG Exercise Icon */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ExIcon color={t.textMuted} />
                            </div>

                            {/* Label */}
                            <span style={{ fontSize: '13px', color: t.text, fontWeight: 500 }}>{label}</span>

                            {/* R checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleFlex(key, 'r')}
                              style={{
                                width: '26px', height: '26px', borderRadius: '6px',
                                border: `2px solid ${test.r ? t.accent : t.border}`,
                                background: test.r ? t.accent : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                              }}>
                              {test.r && <Check size={13} color={t.accentFg} strokeWidth={3} />}
                            </button>

                            {/* L checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleFlex(key, 'l')}
                              style={{
                                width: '26px', height: '26px', borderRadius: '6px',
                                border: `2px solid ${test.l ? t.accent : t.border}`,
                                background: test.l ? t.accent : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                              }}>
                              {test.l && <Check size={13} color={t.accentFg} strokeWidth={3} />}
                            </button>

                            {/* Note toggle */}
                            <button
                              type="button"
                              onClick={() => toggleNote(key)}
                              title="Add note"
                              style={{
                                width: '26px', height: '26px', borderRadius: '6px',
                                border: `2px solid ${noteOpen || hasNote ? t.accent : t.border}`,
                                background: noteOpen || hasNote ? `${t.accent}20` : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                                color: noteOpen || hasNote ? t.accent : t.textMuted,
                                transition: 'all 0.15s',
                              }}>
                              <StickyNote size={13} />
                            </button>
                          </div>

                          {/* Expandable note textarea */}
                          {noteOpen && (
                            <div style={{
                              border: `1px solid ${t.border}`,
                              borderTop: `1px solid ${t.accent}33`,
                              borderRadius: '0 0 8px 8px',
                              padding: '8px',
                              background: t.bgInput,
                            }}>
                              <textarea
                                autoFocus
                                style={{
                                  ...inputStyle(t),
                                  minHeight: '54px',
                                  resize: 'none',
                                  fontSize: '13px',
                                  padding: '8px 10px',
                                  border: `1px solid ${t.border}`,
                                  borderRadius: '6px',
                                }}
                                placeholder="Add remarks..."
                                value={test.note}
                                onChange={e => setFlexNote(key, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Time / Distance / MHR */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
                    <div>
                      <label style={labelStyle(t)}>Time (min)</label>
                      <input style={inputStyle(t)} type="number" placeholder="30"
                        value={fitTime} onChange={e => setFitTime(e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle(t)}>Distance</label>
                      <input style={inputStyle(t)} placeholder="5.0 km"
                        value={fitDistance} onChange={e => setFitDistance(e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle(t)}>MHR (bpm)</label>
                      <input style={inputStyle(t)} type="number" placeholder="180"
                        value={fitMhr} onChange={e => setFitMhr(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Objectives */}
                <div>
                  <label style={labelStyle(t)}>Objectives</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '12px', color: t.textMuted, pointerEvents: 'none', display: 'flex' }}>
                      <Target size={14} />
                    </div>
                    <textarea style={{ ...inputStyle(t), paddingLeft: '36px', minHeight: '70px', resize: 'vertical' }}
                      placeholder="e.g. Improve cardiovascular fitness, increase mobility..."
                      value={assessment.objectives}
                      onChange={e => setAssessment(p => ({ ...p, objectives: e.target.value }))} />
                  </div>
                </div>

                {/* Primary Goal */}
                <div>
                  <label style={labelStyle(t)}>Primary Goal</label>
                  <select style={{ ...inputStyle(t), appearance: 'none' }} value={assessment.goal}
                    onChange={e => setAssessment(p => ({ ...p, goal: e.target.value }))}>
                    {GOALS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label style={labelStyle(t)}>Status</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['active', 'on-hold', 'inactive'] as ClientStatus[]).map(s => (
                      <button key={s} onClick={() => setAssessment(p => ({ ...p, status: s }))}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '8px',
                          border: `1.5px solid ${assessment.status === s ? t.accent : t.border}`,
                          background: assessment.status === s ? t.accent : t.bgInput,
                          color: assessment.status === s ? t.accentFg : t.textMuted,
                          cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                          textTransform: 'capitalize',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            );
          })()}

        </div>

        {/* Footer buttons */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '12px' }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: `1px solid ${t.border}`, background: t.bgInput,
              color: t.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px', fontWeight: 600,
            }}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <button onClick={handleClose} style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: `1px solid ${t.border}`, background: t.bgInput,
              color: t.textMuted, cursor: 'pointer', fontSize: '14px', fontWeight: 600,
            }}>
              Cancel
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !personal.name.trim()}
              style={{
                flex: 2, padding: '12px', borderRadius: '10px',
                background: step === 1 && !personal.name.trim() ? t.border : t.accent,
                color: step === 1 && !personal.name.trim() ? t.textMuted : t.accentFg,
                border: 'none', cursor: step === 1 && !personal.name.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontSize: '14px', fontWeight: 700,
              }}>
              {step === 2 ? 'Next (Assessment)' : 'Next'} <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!personal.name.trim()}
              style={{
                flex: 2, padding: '12px', borderRadius: '10px',
                background: t.accent, color: t.accentFg,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontSize: '14px', fontWeight: 700,
              }}>
              <Check size={16} /> Create Client
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
