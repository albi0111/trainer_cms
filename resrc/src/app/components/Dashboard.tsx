import React, { useState } from 'react';
import { Search, Plus, Calendar, Clock, ChevronRight, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useTheme } from '../context/ThemeContext';
import { useApp, Client, ClientStatus } from '../context/AppContext';
import { ThemeSwitcher } from './shared/ThemeSwitcher';
import { AddClientModal } from './modals/AddClientModal';
import logoImg from 'figma:asset/c243b055e084800a3c3d518ea61ec2c252aad873.png';

const TODAY = '2026-04-10';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

const statusConfig: Record<ClientStatus, { color: string; label: string }> = {
  active: { color: '#3DCC88', label: 'Active' },
  inactive: { color: '#888888', label: 'Inactive' },
  'on-hold': { color: '#FF9900', label: 'On Hold' },
};

function ClientCard({ client, onClick, t }: { client: Client; onClick: () => void; t: any }) {
  const [hovered, setHovered] = useState(false);
  const todaySessions = client.sessions.filter(s => s.date === TODAY && !s.completed);
  const nextSession = client.sessions.find(s => s.date >= TODAY && !s.completed);
  const sc = statusConfig[client.status];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? t.bgCardHover : t.bgCard,
        border: `1px solid ${hovered ? t.accent + '44' : t.border}`,
        borderRadius: '14px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: hovered ? `0 4px 20px ${t.shadow}` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: `${t.accent}22`, border: `2px solid ${t.accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 700, color: t.accent, flexShrink: 0,
        }}>
          {getInitials(client.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {client.name}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: sc.color, background: `${sc.color}18`, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
              {sc.label}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {client.goal}
          </p>
          {nextSession && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px' }}>
              <Clock size={11} color={t.accent} />
              <span style={{ fontSize: '11px', color: t.textMuted }}>
                {nextSession.date === TODAY ? 'Today' : nextSession.date} · {nextSession.time} · {nextSession.type}
              </span>
            </div>
          )}
        </div>
        <ChevronRight size={16} color={t.textSubtle} style={{ flexShrink: 0, marginTop: '2px' }} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, theme } = useTheme();
  const { clients } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const todaySessions = clients.flatMap(c =>
    c.sessions
      .filter(s => s.date === TODAY)
      .map(s => ({ ...s, clientName: c.name, clientId: c.id }))
  ).sort((a, b) => a.time.localeCompare(b.time));

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.goal.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = clients.filter(c => c.status === 'active').length;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: t.bg }}>
      {/* Header */}
      <div style={{
        background: t.bgCard,
        borderBottom: `1px solid ${t.border}`,
        padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: t.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img src={logoImg} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{
              fontFamily: 'Bebas Neue, cursive',
              fontSize: '22px',
              letterSpacing: '1px',
              color: theme === 'yellow' ? t.text : t.accent,
              lineHeight: 1,
            }}>
              FIT.PERSONA
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="hidden md:block" style={{ fontSize: '12px', color: t.textMuted }}>
              {dateStr}
            </span>
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 24px 100px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: t.text, margin: '0 0 4px' }}>
            Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, Coach 👋
          </h1>
          <p style={{ fontSize: '14px', color: t.textMuted }}>{dateStr}</p>
        </div>

        {/* Layout: 2-col on tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">

          {/* LEFT: Today Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={14} color={t.accent} />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today</span>
                </div>
                <p style={{ fontSize: '28px', fontWeight: 800, color: t.text, lineHeight: 1 }}>{todaySessions.length}</p>
                <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>sessions</p>
              </div>
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Users size={14} color={t.accent} />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</span>
                </div>
                <p style={{ fontSize: '28px', fontWeight: 800, color: t.text, lineHeight: 1 }}>{activeCount}</p>
                <p style={{ fontSize: '12px', color: t.textMuted, marginTop: '4px' }}>clients</p>
              </div>
            </div>

            {/* Today's schedule */}
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Zap size={14} color={t.accent} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Schedule</span>
              </div>
              {todaySessions.length === 0 ? (
                <p style={{ fontSize: '13px', color: t.textMuted, fontStyle: 'italic' }}>No sessions today</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todaySessions.map(s => (
                    <div key={`${s.clientId}-${s.id}`}
                      onClick={() => navigate(`/client/${s.clientId}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', borderRadius: '10px',
                        background: t.bgInput, cursor: 'pointer',
                        border: `1px solid ${t.borderSubtle}`,
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: t.accentFg, flexShrink: 0 }}>
                        {getInitials(s.clientName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: t.text }}>{s.clientName}</p>
                        <p style={{ fontSize: '11px', color: t.textMuted }}>{s.time} · {s.type} · {s.duration}min</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Client List */}
          <div>
            {/* Search + Add */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={15} color={t.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  style={{
                    width: '100%', padding: '10px 14px 10px 36px',
                    background: t.bgCard, border: `1px solid ${t.border}`,
                    borderRadius: '10px', color: t.text, fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  placeholder="Search clients..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '10px 18px', borderRadius: '10px',
                  background: t.accent, color: t.accentFg,
                  border: 'none', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap',
                }}
              >
                <Plus size={16} /> Add Client
              </button>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: t.textMuted }}>
                {filtered.length} client{filtered.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </span>
            </div>

            {/* Client list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: t.textMuted, background: t.bgCard, borderRadius: '14px', border: `1px solid ${t.border}` }}>
                  <p style={{ fontSize: '14px', marginBottom: '4px' }}>No clients found</p>
                  <p style={{ fontSize: '12px' }}>Try a different search term</p>
                </div>
              ) : (
                filtered.map(client => (
                  <ClientCard key={client.id} client={client} t={t} onClick={() => navigate(`/client/${client.id}`)} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAB — visible on mobile only */}
      <button
        onClick={() => setAddOpen(true)}
        className="flex items-center justify-center md:hidden"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: t.accent, color: t.accentFg,
          border: 'none', cursor: 'pointer',
          boxShadow: `0 8px 24px ${t.shadow}`,
          zIndex: 200,
        }}
      >
        <Plus size={24} />
      </button>

      <AddClientModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={id => { setAddOpen(false); navigate(`/client/${id}`); }}
      />
    </div>
  );
}