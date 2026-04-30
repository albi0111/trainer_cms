// ─────────────────────────────────────────────────────────────────────────────
// ScheduleCalendarGrid — Week-snapping calendar with hourly time slots
// Reference: /reference/components/schedule/ScheduleCalendarGrid.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useEffect, useRef, useState } from 'react';
import './ScheduleCalendarGrid.css';

export interface ScheduledSession {
  id: string;
  client_id: string;
  client_name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  focus: string;
  type?: string;
  status?: string;
}

interface ScheduleCalendarGridProps {
  sessions: ScheduledSession[];
  activeClientId?: string;
  onSlotPress: (date: string, hour: number) => void;
  onSessionPress: (session: ScheduledSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onPasteSession?: (date: string, hour: number, sourceId: string) => void;
  highlightSessionId?: string | null;
  scrollToDate?: string | null;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM to 11 PM

export default function ScheduleCalendarGrid({
  sessions,
  activeClientId,
  onSlotPress,
  onSessionPress,
  onDeleteSession,
  onPasteSession,
  highlightSessionId,
  scrollToDate,
}: ScheduleCalendarGridProps) {
  const [width, setWidth] = useState(window.innerWidth);
  const [contextMenu, setContextMenu] = useState<{ type: 'session' | 'slot', id?: string, date?: string, hour?: number, x: number, y: number } | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const longPressTimer = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const scrollRef = useRef<HTMLDivElement>(null);

  const CELL_WIDTH = isMobile ? 80 : isTablet ? 110 : 140;
  const DATE_COL_WIDTH = isMobile ? 70 : isTablet ? 100 : 120;
  const HEADER_HEIGHT = isMobile ? 45 : 60;
  const ROW_HEIGHT = isMobile ? 55 : isTablet ? 70 : 80;

  // Generate 52 weeks (-10 weeks to +42 weeks)
  const weeks = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() - base.getDay()); // Snap to Sunday
    base.setDate(base.getDate() - 7 * 10); // Go back 10 weeks
    
    const wks: string[][] = [];
    for (let w = 0; w < 52; w++) {
      const wDays: string[] = [];
      for (let d = 0; d < 7; d++) {
        const dateObj = new Date(base);
        dateObj.setDate(base.getDate() + w * 7 + d);
        wDays.push(dateObj.toISOString().split('T')[0]!);
      }
      wks.push(wDays);
    }
    return wks;
  }, []);

  const todayStr = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }, []);

  // Map sessions by date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, ScheduledSession[]> = {};
    sessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date]!.push(s);
    });
    return map;
  }, [sessions]);

  // Initial scroll to today or scrollToDate
  useEffect(() => {
    if (scrollRef.current) {
      const targetDate = scrollToDate || todayStr;
      const targetWeekIndex = weeks.findIndex(w => w.includes(targetDate));
      
      if (targetWeekIndex !== -1) {
        setTimeout(() => {
          const el = scrollRef.current?.querySelector(`#week-group-${targetWeekIndex}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }, 100);
      }
    }
  }, [scrollToDate, todayStr, weeks]);

  // Ensure horizontal scrolling starts at 5 AM
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, []);

  const handleLongPress = (type: 'session' | 'slot', data: any, e: any) => {
    if (window.navigator.vibrate) window.navigator.vibrate(20);
    
    setContextMenu({
      type,
      x: e.clientX,
      y: e.clientY,
      ...data
    });
  };

  const startTimer = (type: 'session' | 'slot', data: any, e: any) => {
    const eventData = {
      clientX: e.touches ? e.touches[0].clientX : e.clientX,
      clientY: e.touches ? e.touches[0].clientY : e.clientY
    };
    longPressTimer.current = setTimeout(() => handleLongPress(type, data, eventData), 600);
  };

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div 
      className="schedule-calendar-grid-v2" 
      ref={scrollRef}
      style={{
        flex: 1,
        height: '100%',
        overflow: 'auto',
        backgroundColor: '#0F0F0F',
        scrollSnapType: width < 1024 ? 'none' : 'y mandatory',
        position: 'relative',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: `${DATE_COL_WIDTH}px repeat(${HOURS.length}, ${CELL_WIDTH}px)`, minWidth: `${DATE_COL_WIDTH + HOURS.length * CELL_WIDTH}px` }}>
        
        {/* TOP HEADER ROW - Sticky vertically */}
        <div 
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            backgroundColor: '#111',
            borderBottom: '1px solid #222',
            borderRight: '1px solid #222',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: HEADER_HEIGHT,
            left: 0
          }}
        >
          <svg width={isMobile ? 16 : 20} height={isMobile ? 16 : 20} viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        
        {HOURS.map(hour => {
          const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          return (
            <div 
              key={`h-${hour}`}
              style={{
                position: 'sticky', top: 0, zIndex: 20,
                backgroundColor: '#111',
                borderBottom: '1px solid #222',
                borderRight: '1px solid #222',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: HEADER_HEIGHT
              }}
            >
              <span style={{ color: '#AAA', fontSize: '11px', fontWeight: '700' }}>{displayHour} {ampm}</span>
            </div>
          );
        })}

        {/* WEEKS */}
        {weeks.map((weekDays, wIndex) => (
          <div key={`week-${wIndex}`} style={{ display: 'contents' }}>
            {weekDays.map((dateStr, dIndex) => {
              const dateObj = new Date(dateStr + 'T00:00:00');
              const isToday = dateStr === todayStr;
              const daySessions = sessionsByDate[dateStr] || [];

              return (
                <div key={dateStr} style={{ display: 'contents' }}>
                  <div 
                    id={dIndex === 0 ? `week-group-${wIndex}` : undefined}
                    style={{
                      position: 'sticky', left: 0, zIndex: 10,
                      backgroundColor: isToday ? '#2a1a00' : '#0F0F0F',
                      borderRight: '1px solid #1A1A1A',
                      borderBottom: '1px solid #1A1A1A',
                      height: ROW_HEIGHT,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      scrollSnapAlign: dIndex === 0 ? 'start' : 'none',
                      scrollMarginTop: dIndex === 0 ? `${HEADER_HEIGHT}px` : '0'
                    }}
                  >
                    <span style={{ color: isToday ? '#FFD700' : '#666', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span style={{ color: isToday ? '#FFD700' : '#FFF', fontSize: '18px', fontWeight: '800', margin: '2px 0' }}>
                      {dateObj.getDate()}
                    </span>
                    <span style={{ color: isToday ? '#FFD700' : '#444', fontSize: '10px', fontWeight: '600' }}>
                      {dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(',', "'")}
                    </span>
                  </div>

                  {HOURS.map(hour => (
                    <div 
                      key={`${dateStr}-${hour}`}
                      onClick={() => !contextMenu && onSlotPress(dateStr, hour)}
                      onMouseDown={(e) => startTimer('slot', { date: dateStr, hour }, e)}
                      onMouseUp={clearTimer}
                      onMouseLeave={clearTimer}
                      onTouchStart={(e) => startTimer('slot', { date: dateStr, hour }, e)}
                      onTouchEnd={clearTimer}
                      style={{
                        borderRight: '1px solid #1A1A1A',
                        borderBottom: '1px solid #1A1A1A',
                        height: ROW_HEIGHT,
                        position: 'relative',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                    >
                      {daySessions.map(session => {
                        if (!session.start_time) return null;
                        const [sh, sm] = session.start_time.split(':').map(Number);
                        if (sh !== hour) return null;

                        const duration = session.duration_minutes || 60;
                        const leftOffset = (sm! / 60) * CELL_WIDTH;
                        const itemWidth = Math.max((duration / 60) * CELL_WIDTH, 30);
                        const isActive = session.client_id === activeClientId;
                        const isHighlighted = highlightSessionId ? session.id === highlightSessionId : false;
                        const isDimmed = highlightSessionId ? session.id !== highlightSessionId : false;

                        return (
                          <div
                            key={session.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!contextMenu && isActive) onSessionPress(session);
                            }}
                            onMouseDown={(e) => {
                              if (isActive) {
                                e.stopPropagation();
                                startTimer('session', { id: session.id }, e);
                              }
                            }}
                            onMouseUp={clearTimer}
                            onMouseLeave={clearTimer}
                            onTouchStart={(e) => {
                              if (isActive) {
                                e.stopPropagation();
                                startTimer('session', { id: session.id }, e);
                              }
                            }}
                            onTouchEnd={clearTimer}
                            style={{
                              position: 'absolute', top: '4px', left: `${leftOffset}px`, width: `${itemWidth}px`, height: `${ROW_HEIGHT - 8}px`,
                              borderRadius: '8px', padding: isMobile ? '4px' : '8px', zIndex: 5,
                              cursor: isActive ? 'pointer' : 'default',
                              backgroundColor: isHighlighted ? '#FFD700' : isActive ? '#FFD700' : '#222',
                              border: isHighlighted ? '2px solid #FFF' : 'none',
                              opacity: isDimmed ? 0.4 : 1,
                              display: 'flex', flexDirection: 'column', justifyContent: 'center',
                              boxShadow: isHighlighted ? '0 0 12px rgba(255,215,0,0.8)' : '0 2px 4px rgba(0,0,0,0.3)',
                              WebkitTapHighlightColor: 'transparent'
                            }}
                          >
                            <span style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: isHighlighted ? '900' : '800', color: isHighlighted ? '#000' : isActive ? '#000' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {isActive ? 'OWN' : session.client_name.substring(0, 8)}
                            </span>
                            <span style={{ fontSize: isMobile ? '8px' : '9px', fontWeight: isHighlighted ? '700' : '600', color: isHighlighted ? '#222' : isActive ? '#000' : '#666', marginTop: isMobile ? '2px' : '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {session.focus || 'Workout'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {contextMenu && (
        <>
          <div className="context-menu-overlay" onClick={() => setContextMenu(null)} />
          <div 
            className="calendar-context-menu"
            style={{ 
              position: 'fixed',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              transform: 'translate(-50%, -100%)',
              zIndex: 1000
            }}
          >
            {contextMenu.type === 'session' ? (
              <div className="menu-group">
                <button 
                  className="menu-item" 
                  onClick={() => {
                    setCopiedSessionId(contextMenu.id!);
                    setContextMenu(null);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  <span>{copiedSessionId === contextMenu.id ? 'Copied' : 'Copy'}</span>
                </button>
                <div className="menu-divider" />
                <button className="menu-item danger" onClick={() => { onDeleteSession?.(contextMenu.id!); setContextMenu(null); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <div className="menu-group">
                {copiedSessionId ? (
                  <button className="menu-item" onClick={() => { onPasteSession?.(contextMenu.date!, contextMenu.hour!, copiedSessionId); setContextMenu(null); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    <span>Paste</span>
                  </button>
                ) : (
                  <div className="menu-item disabled"><span style={{ color: '#666', fontSize: '11px' }}>Hold session to copy</span></div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
