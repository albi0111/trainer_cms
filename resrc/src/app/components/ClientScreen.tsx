import React, { useState } from 'react';
import {
  ArrowLeft, User, Plus, Edit2, ChevronDown, ChevronUp,
  Check, X, Trash2, Calendar, TrendingUp, BarChart2,
  Dumbbell, Salad, FileText,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useApp, Session, ClientStatus } from '../context/AppContext';
import { ThemeSwitcher } from './shared/ThemeSwitcher';
import { ProfileModal } from './modals/ProfileModal';
import { SessionModal } from './modals/SessionModal';
import { ProgressModal } from './modals/ProgressModal';
import { WorkoutPlanModal } from './modals/WorkoutPlanModal';
import { DietPlanModal } from './modals/DietPlanModal';
import logoImg from 'figma:asset/c243b055e084800a3c3d518ea61ec2c252aad873.png';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const statusConfig: Record<ClientStatus, { color: string; bg: string; label: string }> = {
  active:    { color: '#3DCC88', bg: '#3DCC8818', label: 'Active' },
  inactive:  { color: '#888888', bg: '#88888818', label: 'Inactive' },
  'on-hold': { color: '#FF9900', bg: '#FF990018', label: 'On Hold' },
};

function SectionCard({ title, icon: Icon, accentColor, children, actionLabel, onAction, t }: any) {
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={15} color={accentColor} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>{title}</span>
        </div>
        {actionLabel && onAction && (
          <button onClick={onAction} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
            {actionLabel.includes('Add') ? <Plus size={12} /> : <Edit2 size={12} />}
            {actionLabel}
          </button>
        )}
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

export function ClientScreen() {
  const { t, theme } = useTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getClient, updateOverviewNotes, deleteSession, deleteProgress } = useApp();

  const client = getClient(id!);

  const [profileOpen, setProfileOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [progressOpen, setProgressOpen] = useState(false);
  const [workoutOpen, setWorkoutOpen] = useState(false);
  const [dietOpen, setDietOpen] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState('');

  if (!client) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: t.bg }}>
        <div style={{ textAlign: 'center', color: t.textMuted }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: t.text }}>Client not found</p>
          <button onClick={() => navigate('/')} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '10px', background: t.accent, color: t.accentFg, border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const sc = statusConfig[client.status];
  const upcomingSessions = client.sessions.filter(s => !s.completed).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const pastSessions = client.sessions.filter(s => s.completed).sort((a, b) => b.date.localeCompare(a.date));
  const sortedProgress = [...client.progress].sort((a, b) => a.date.localeCompare(b.date));

  // Analytics data
  const weightData = sortedProgress.map(p => ({ date: p.date.slice(5), weight: p.weight, bf: p.bodyFat }));
  const sessionsByWeek: Record<string, number> = {};
  client.sessions.forEach(s => {
    const week = `W${Math.ceil(new Date(s.date).getDate() / 7)}`;
    sessionsByWeek[week] = (sessionsByWeek[week] || 0) + 1;
  });
  const sessionChartData = Object.entries(sessionsByWeek).map(([week, count]) => ({ week, count }));

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: t.bgInput, border: `1px solid ${t.border}`,
    borderRadius: '8px', color: t.text, fontSize: '14px',
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'Inter, sans-serif',
  };

  const bmi = client.weight && client.height ? (client.weight / Math.pow(client.height / 100, 2)).toFixed(1) : null;

  return (
    <div style={{ minHeight: '100vh', background: t.bg }}>
      {/* Header */}
      <div style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <ArrowLeft size={14} /> Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: t.accent, overflow: 'hidden' }}>
                <img src={logoImg} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontFamily: 'Bebas Neue, cursive', fontSize: '18px', letterSpacing: '1px', color: theme === 'yellow' ? t.text : t.accent, lineHeight: 1 }}>
                FIT.PERSONA
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeSwitcher />
            <button onClick={() => setProfileOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <User size={14} /> Profile
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 20px 80px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Summary Card */}
        <div style={{ border: `1px solid ${t.border}`, borderRadius: '20px', padding: '24px', background: `linear-gradient(135deg, ${t.bgCard}, ${t.accent}08)` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: t.accentFg, flexShrink: 0 }}>
              {getInitials(client.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: t.text, margin: 0 }}>{client.name}</h1>
                <span style={{ fontSize: '12px', fontWeight: 700, color: sc.color, background: sc.bg, padding: '3px 10px', borderRadius: '20px' }}>
                  {sc.label}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: t.textMuted, marginTop: '4px' }}>{client.goal}</p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '14px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Age', value: client.age ? `${client.age}y` : '—' },
                  { label: 'Weight', value: client.weight ? `${client.weight} kg` : '—' },
                  { label: 'Height', value: client.height ? `${client.height} cm` : '—' },
                  { label: 'Target', value: client.targetWeight ? `${client.targetWeight} kg` : '—' },
                  { label: 'BMI', value: bmi || '—' },
                ].map(stat => (
                  <div key={stat.label}>
                    <p style={{ fontSize: '10px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</p>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: t.text, marginTop: '2px' }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <SectionCard title="Overview" icon={FileText} accentColor={t.accent} t={t}
          actionLabel={overviewEditing ? undefined : 'Edit'}
          onAction={overviewEditing ? undefined : () => { setOverviewDraft(client.overviewNotes); setOverviewEditing(true); }}>
          {overviewEditing ? (
            <div>
              <textarea
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', marginBottom: '12px' }}
                value={overviewDraft}
                onChange={e => setOverviewDraft(e.target.value)}
                placeholder="Notes about this client..."
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setOverviewEditing(false)} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  Cancel
                </button>
                <button onClick={() => { updateOverviewNotes(id!, overviewDraft); setOverviewEditing(false); }}
                  style={{ flex: 2, padding: '9px', borderRadius: '8px', background: t.accent, color: t.accentFg, border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  <Check size={13} /> Save
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: client.overviewNotes ? t.text : t.textMuted, lineHeight: 1.6, fontStyle: client.overviewNotes ? 'normal' : 'italic' }}>
              {client.overviewNotes || 'No overview notes yet. Click Edit to add.'}
            </p>
          )}
        </SectionCard>

        {/* Sessions */}
        <SectionCard title="Sessions" icon={Calendar} accentColor="#6C8EFF" t={t}
          actionLabel="Add Session"
          onAction={() => { setEditSession(null); setSessionModalOpen(true); }}>
          {upcomingSessions.length === 0 && pastSessions.length === 0 ? (
            <p style={{ fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>No sessions yet. Add the first session.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {upcomingSessions.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#6C8EFF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Upcoming</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {upcomingSessions.slice(0, 3).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: t.bgInput, borderRadius: '10px', border: `1px solid ${t.border}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: t.text }}>{s.date}</span>
                            <span style={{ fontSize: '11px', color: '#6C8EFF', background: '#6C8EFF18', padding: '2px 7px', borderRadius: '12px', fontWeight: 600 }}>{s.type}</span>
                          </div>
                          <p style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>{s.time} · {s.duration}min {s.notes && `· ${s.notes}`}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setEditSession(s); setSessionModalOpen(true); }} style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => deleteSession(id!, s.id)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pastSessions.length > 0 && (
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Completed</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {pastSessions.slice(0, 3).map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: t.bgInput, borderRadius: '10px', border: `1px solid ${t.borderSubtle}`, opacity: 0.7 }}>
                        <Check size={14} color={t.success} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: t.text }}>{s.date} · {s.time}</span>
                          <span style={{ fontSize: '11px', color: t.textMuted }}> · {s.type} · {s.duration}min</span>
                        </div>
                        <button onClick={() => deleteSession(id!, s.id)} style={{ width: '24px', height: '24px', borderRadius: '5px', border: `1px solid ${t.border}`, background: 'transparent', color: t.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Progress */}
        <SectionCard title="Progress" icon={TrendingUp} accentColor="#3DCC88" t={t}
          actionLabel="Log Progress"
          onAction={() => setProgressOpen(true)}>
          {client.progress.length === 0 ? (
            <p style={{ fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>No progress logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedProgress.slice(-4).reverse().map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: t.bgInput, borderRadius: '10px', border: `1px solid ${t.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Weight</span>
                        <p style={{ fontSize: '16px', fontWeight: 800, color: '#3DCC88' }}>{p.weight}<span style={{ fontSize: '11px', color: t.textMuted, fontWeight: 400 }}> kg</span></p>
                      </div>
                      {p.bodyFat !== undefined && (
                        <div>
                          <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Body Fat</span>
                          <p style={{ fontSize: '16px', fontWeight: 800, color: t.text }}>{p.bodyFat}<span style={{ fontSize: '11px', color: t.textMuted, fontWeight: 400 }}>%</span></p>
                        </div>
                      )}
                      <div style={{ marginLeft: 'auto' }}>
                        <p style={{ fontSize: '11px', color: t.textMuted }}>{p.date}</p>
                        {p.notes && <p style={{ fontSize: '11px', color: t.textMuted, fontStyle: 'italic' }}>{p.notes}</p>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteProgress(id!, p.id)} style={{ width: '24px', height: '24px', borderRadius: '5px', border: `1px solid ${t.border}`, background: 'transparent', color: t.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Analytics */}
        <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          <button
            onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
            style={{
              width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: analyticsExpanded ? `1px solid ${t.border}` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FF6B9318', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={15} color="#FF6B93" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: t.text }}>Analytics</span>
              <span style={{ fontSize: '11px', color: t.textMuted, fontStyle: 'italic' }}>{analyticsExpanded ? 'tap to collapse' : 'tap to expand'}</span>
            </div>
            {analyticsExpanded ? <ChevronUp size={16} color={t.textMuted} /> : <ChevronDown size={16} color={t.textMuted} />}
          </button>

          {analyticsExpanded && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {weightData.length > 1 ? (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Weight Trend (kg)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={weightData}>
                      <XAxis dataKey="date" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip contentStyle={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '12px' }} />
                      <Line type="monotone" dataKey="weight" stroke={t.accent} strokeWidth={2.5} dot={{ fill: t.accent, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>Need at least 2 progress entries to show weight trend.</p>
              )}

              {sessionChartData.length > 0 && (
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Sessions by Week</p>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={sessionChartData}>
                      <XAxis dataKey="week" tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: t.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '8px', color: t.text, fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#6C8EFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workout Plan */}
        <SectionCard title="Workout Plan" icon={Dumbbell} accentColor="#FF9900" t={t}
          actionLabel="Edit Plan"
          onAction={() => setWorkoutOpen(true)}>
          {client.workoutPlan.length === 0 ? (
            <p style={{ fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>No workout plan yet. Click Edit Plan to build one.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {client.workoutPlan.map(day => (
                <div key={day.day}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#FF9900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day.day}</span>
                    <div style={{ flex: 1, height: '1px', background: t.border }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {day.exercises.map((ex, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', background: t.bgInput, borderRadius: '8px' }}>
                        <span style={{ fontSize: '13px', color: t.text, flex: 1 }}>{ex.name || '—'}</span>
                        <span style={{ fontSize: '11px', color: t.textMuted, whiteSpace: 'nowrap' }}>{ex.sets}×{ex.reps}</span>
                        {ex.notes && <span style={{ fontSize: '10px', color: t.textSubtle, fontStyle: 'italic' }}>{ex.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Diet Plan */}
        <SectionCard title="Diet Plan" icon={Salad} accentColor="#4ECDC4" t={t}
          actionLabel="Edit Plan"
          onAction={() => setDietOpen(true)}>
          {client.dietPlan.calories === 0 && client.dietPlan.meals.length === 0 ? (
            <p style={{ fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>No diet plan yet. Click Edit Plan to add one.</p>
          ) : (
            <div>
              {/* Macros */}
              {client.dietPlan.calories > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {[
                    { label: 'Calories', value: client.dietPlan.calories, unit: 'kcal', color: t.accent },
                    { label: 'Protein', value: client.dietPlan.protein, unit: 'g', color: '#FF6B6B' },
                    { label: 'Carbs', value: client.dietPlan.carbs, unit: 'g', color: '#4ECDC4' },
                    { label: 'Fat', value: client.dietPlan.fat, unit: 'g', color: '#FFE66D' },
                  ].map(macro => (
                    <div key={macro.label} style={{ textAlign: 'center', padding: '10px', background: t.bgInput, borderRadius: '10px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: macro.color }}>{macro.value}</p>
                      <p style={{ fontSize: '10px', color: t.textMuted }}>{macro.unit}</p>
                      <p style={{ fontSize: '10px', fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{macro.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Meals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {client.dietPlan.meals.map((meal, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', background: t.bgInput, borderRadius: '8px', border: `1px solid ${t.border}` }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#4ECDC4', marginBottom: '3px' }}>{meal.name}</p>
                    <p style={{ fontSize: '13px', color: t.text }}>{meal.description}</p>
                  </div>
                ))}
              </div>
              {client.dietPlan.notes && (
                <p style={{ fontSize: '12px', color: t.textMuted, fontStyle: 'italic', marginTop: '10px', padding: '10px', background: t.bgInput, borderRadius: '8px' }}>
                  💊 {client.dietPlan.notes}
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Modals */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} clientId={id!} />
      <SessionModal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} clientId={id!} session={editSession} />
      <ProgressModal isOpen={progressOpen} onClose={() => setProgressOpen(false)} clientId={id!} />
      <WorkoutPlanModal isOpen={workoutOpen} onClose={() => setWorkoutOpen(false)} clientId={id!} />
      <DietPlanModal isOpen={dietOpen} onClose={() => setDietOpen(false)} clientId={id!} />
    </div>
  );
}