// ─────────────────────────────────────────────────────────────────────────────
// ScheduleCalendarGrid — Week-snapping calendar with hourly time slots
// Reference: /reference/components/schedule/ScheduleCalendarGrid.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import './ScheduleCalendarGrid.css';
import { useLongPress } from '../../hooks/useLongPress';

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

type ContextMenuState =
  | { type: 'session'; id: string; x: number; y: number }
  | { type: 'slot'; date: string; hour: number; x: number; y: number };

const HOURS = Array.from({ length: 19 }, (_, index) => index + 5); // 5 AM to 11 PM
const TARGET_WEEK_INDEX = 26;
const TOTAL_WEEKS = 53;

function parseLocalIso(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1, 12);
}

function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getSessionDurationMinutes(session: ScheduledSession): number {
  if (typeof session.duration_minutes === 'number' && session.duration_minutes > 0) {
    return session.duration_minutes;
  }

  if (session.start_time && session.end_time) {
    const [startHour = 0, startMinute = 0] = session.start_time.split(':').map(Number);
    const [endHour = 0, endMinute = 0] = session.end_time.split(':').map(Number);
    let duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (duration <= 0) {
      duration += 24 * 60;
    }
    return duration;
  }

  return 60;
}

function buildWeeks(targetDate: string): string[][] {
  const targetWeekStart = startOfWeek(parseLocalIso(targetDate));
  const firstWeekStart = addDays(targetWeekStart, -TARGET_WEEK_INDEX * 7);

  return Array.from({ length: TOTAL_WEEKS }, (_, weekIndex) => (
    Array.from({ length: 7 }, (_, dayIndex) => (
      toLocalIso(addDays(firstWeekStart, (weekIndex * 7) + dayIndex))
    ))
  ));
}

function formatMonthYear(date: Date): string {
  return `${date.toLocaleDateString('en-US', { month: 'short' })} '${String(date.getFullYear()).slice(-2)}`;
}

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
  const [width, setWidth] = useState(() => window.innerWidth);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { startLongPress, handlePointerMove, cancelLongPress, consumeLongPress } = useLongPress();

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPhone = width < 480;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const CELL_WIDTH = isPhone ? 72 : isMobile ? 82 : isTablet ? 96 : 120;
  const DATE_COL_WIDTH = isPhone ? 62 : isMobile ? 76 : isTablet ? 90 : 120;
  const HEADER_HEIGHT = isPhone ? 42 : isMobile ? 50 : isTablet ? 56 : 58;
  const ROW_HEIGHT = isPhone ? 52 : isMobile ? 58 : isTablet ? 62 : 76;
  const WEEK_HEIGHT = ROW_HEIGHT * 7;
  const GRID_WIDTH = HOURS.length * CELL_WIDTH;
  const todayStr = useMemo(() => toLocalIso(new Date()), []);
  const targetDate = scrollToDate || todayStr;

  const weeks = useMemo(() => buildWeeks(targetDate), [targetDate]);

  const gridVars = useMemo(() => ({
    '--calendar-cell-width': `${CELL_WIDTH}px`,
    '--calendar-date-col-width': `${DATE_COL_WIDTH}px`,
    '--calendar-grid-width': `${GRID_WIDTH}px`,
    '--calendar-header-height': `${HEADER_HEIGHT}px`,
    '--calendar-row-height': `${ROW_HEIGHT}px`,
    '--calendar-week-height': `${WEEK_HEIGHT}px`,
  }) as CSSProperties, [CELL_WIDTH, DATE_COL_WIDTH, GRID_WIDTH, HEADER_HEIGHT, ROW_HEIGHT, WEEK_HEIGHT]);

  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, ScheduledSession[]> = {};

    for (const session of sessions) {
      if (!grouped[session.date]) {
        grouped[session.date] = [];
      }
      grouped[session.date]!.push(session);
    }

    for (const dateSessions of Object.values(grouped)) {
      dateSessions.sort((left, right) => {
        const leftValue = left.start_time || '00:00';
        const rightValue = right.start_time || '00:00';
        return leftValue.localeCompare(rightValue);
      });
    }

    return grouped;
  }, [sessions]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) {
      return;
    }

    window.requestAnimationFrame(() => {
      scroller.scrollTo({
        top: TARGET_WEEK_INDEX * WEEK_HEIGHT,
        behavior: 'auto',
      });
    });
  }, [targetDate, WEEK_HEIGHT]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) {
      return;
    }

    if (!highlightSessionId) {
      scroller.scrollTo({ left: 0, behavior: 'auto' });
      return;
    }

    const targetSession = sessions.find((session) => session.id === highlightSessionId);
    if (!targetSession?.start_time) {
      return;
    }

    const [startHour = HOURS[0] || 0, startMinute = 0] = targetSession.start_time.split(':').map(Number);
    const firstVisibleHour = HOURS[0] || 0;
    const sessionOffset = (((startHour - firstVisibleHour) + (startMinute / 60)) * CELL_WIDTH) - (CELL_WIDTH * 1.5);

    window.requestAnimationFrame(() => {
      scroller.scrollTo({
        left: Math.max(0, sessionOffset),
        behavior: 'smooth',
      });
    });
  }, [highlightSessionId, sessions, CELL_WIDTH]);

  const openContextMenu = (
    type: ContextMenuState['type'],
    data: Omit<Extract<ContextMenuState, { type: typeof type }>, 'type' | 'x' | 'y'>,
    pointer: { x: number; y: number },
  ) => {
    if (type === 'session') {
      setContextMenu({
        type,
        id: (data as { id: string }).id,
        x: pointer.x,
        y: pointer.y,
      });
      return;
    }

    setContextMenu({
      type,
      date: (data as { date: string }).date,
      hour: (data as { hour: number }).hour,
      x: pointer.x,
      y: pointer.y,
    });
  };

  const startContextTimer = (
    type: ContextMenuState['type'],
    data: Omit<Extract<ContextMenuState, { type: typeof type }>, 'type' | 'x' | 'y'>,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    const pointer = { x: event.clientX, y: event.clientY };
    startLongPress(() => openContextMenu(type, data, pointer), event);
  };

  const handleScroll = () => {
    if (contextMenu) {
      setContextMenu(null);
    }
  };

  return (
    <div
      className="schedule-calendar-grid-v2"
      ref={scrollRef}
      style={gridVars}
      onScroll={handleScroll}
    >
      <div className="schedule-calendar-grid-v2__canvas">
        <div className="schedule-calendar-grid-v2__header-row">
          <div className="schedule-calendar-grid-v2__corner-cell">
            <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="#4A4A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>

          <div className="schedule-calendar-grid-v2__hours-row">
            {HOURS.map((hour) => {
              const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
              const ampm = hour >= 12 ? 'PM' : 'AM';

              return (
                <div key={`hour-${hour}`} className="schedule-calendar-grid-v2__hour-cell">
                  <span>{displayHour} {ampm}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="schedule-calendar-grid-v2__weeks">
          {weeks.map((weekDays, weekIndex) => (
            <section key={`week-${weekIndex}`} className="schedule-calendar-grid-v2__week-page" aria-label={`Week starting ${weekDays[0] || ''}`}>
              {weekDays.map((dateStr) => {
                const dateObj = parseLocalIso(dateStr);
                const isToday = dateStr === todayStr;
                const daySessions = sessionsByDate[dateStr] || [];

                return (
                  <div key={dateStr} className="schedule-calendar-grid-v2__day-row">
                    <div className={`schedule-calendar-grid-v2__date-cell ${isToday ? 'is-today' : ''}`}>
                      <span className="schedule-calendar-grid-v2__day-name">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="schedule-calendar-grid-v2__day-number">
                        {dateObj.getDate()}
                      </span>
                      <span className="schedule-calendar-grid-v2__month-label">
                        {formatMonthYear(dateObj)}
                      </span>
                    </div>

                    <div className={`schedule-calendar-grid-v2__time-row ${isToday ? 'is-today' : ''}`}>
                      {HOURS.map((hour) => (
                        <div
                          key={`${dateStr}-${hour}`}
                          className={`schedule-calendar-grid-v2__slot ${isToday ? 'is-today' : ''}`}
                          onClick={() => {
                            if (consumeLongPress()) {
                              return;
                            }

                            if (!contextMenu) {
                              onSlotPress(dateStr, hour);
                            }
                          }}
                          onPointerDown={(event) => {
                            if (onPasteSession) {
                              startContextTimer('slot', { date: dateStr, hour }, event);
                            }
                          }}
                          onPointerMove={handlePointerMove}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                          onPointerCancel={cancelLongPress}
                        />
                      ))}

                      {daySessions.map((session) => {
                        if (!session.start_time) {
                          return null;
                        }

                        const [startHour = 0, startMinute = 0] = session.start_time.split(':').map(Number);
                        const firstVisibleHour = HOURS[0] || 0;
                        const lastVisibleHour = HOURS[HOURS.length - 1] || 23;
                        const startOffsetHours = (startHour - firstVisibleHour) + (startMinute / 60);

                        if (startOffsetHours < 0 || startHour > lastVisibleHour) {
                          return null;
                        }

                        const leftOffset = startOffsetHours * CELL_WIDTH;
                        const maxWidth = GRID_WIDTH - leftOffset - 4;
                        if (maxWidth <= 0) {
                          return null;
                        }

                        const sessionWidth = Math.max(Math.min((getSessionDurationMinutes(session) / 60) * CELL_WIDTH, maxWidth), 34);
                        const isOwnedSession = Boolean(activeClientId) && session.client_id === activeClientId;
                        const canOpenSession = activeClientId ? isOwnedSession : true;
                        const canManageSession = Boolean(activeClientId) && isOwnedSession;
                        const isHighlighted = highlightSessionId ? session.id === highlightSessionId : false;
                        const isDimmed = highlightSessionId ? session.id !== highlightSessionId : false;

                        return (
                          <div
                            key={session.id}
                            className={[
                              'schedule-calendar-grid-v2__session',
                              isOwnedSession ? 'is-owned' : 'is-other',
                              canOpenSession ? 'is-clickable' : '',
                              isHighlighted ? 'is-highlighted' : '',
                              isDimmed ? 'is-dimmed' : '',
                            ].filter(Boolean).join(' ')}
                            style={{
                              left: `${leftOffset}px`,
                              width: `${sessionWidth}px`,
                            }}
                            onClick={(event) => {
                              event.stopPropagation();

                              if (consumeLongPress()) {
                                return;
                              }

                              if (!contextMenu && canOpenSession) {
                                onSessionPress(session);
                              }
                            }}
                            onPointerDown={(event) => {
                              if (!canManageSession) {
                                return;
                              }

                              event.stopPropagation();
                              startContextTimer('session', { id: session.id }, event);
                            }}
                            onPointerMove={handlePointerMove}
                            onPointerUp={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            onPointerCancel={cancelLongPress}
                          >
                            <span className="schedule-calendar-grid-v2__session-client">
                              {isOwnedSession ? 'OWN' : session.client_name.substring(0, 8)}
                            </span>
                            <span className="schedule-calendar-grid-v2__session-focus">
                              {session.focus || 'Workout'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
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
              zIndex: 1000,
            }}
          >
            {contextMenu.type === 'session' ? (
              <div className="menu-group">
                <button
                  className="menu-item"
                  onClick={() => {
                    setCopiedSessionId(contextMenu.id);
                    setContextMenu(null);
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>{copiedSessionId === contextMenu.id ? 'Copied' : 'Copy'}</span>
                </button>

                {onDeleteSession && (
                  <>
                    <div className="menu-divider" />
                    <button
                      className="menu-item danger"
                      onClick={() => {
                        onDeleteSession(contextMenu.id);
                        setContextMenu(null);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="menu-group">
                {copiedSessionId && onPasteSession ? (
                  <button
                    className="menu-item"
                    onClick={() => {
                      onPasteSession(contextMenu.date, contextMenu.hour, copiedSessionId);
                      setContextMenu(null);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    </svg>
                    <span>Paste</span>
                  </button>
                ) : (
                  <div className="menu-item disabled">
                    <span style={{ color: '#666', fontSize: '11px' }}>Hold session to copy</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
