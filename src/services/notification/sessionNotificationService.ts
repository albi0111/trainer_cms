import type { Session } from '../../types';
import { db } from '../../db/db';
import { getSessionEndMillis } from '../sessionService';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const NOTIFICATION_STORAGE_PREFIX = 'fit-persona:pending-log-notice';
const MEASUREMENT_REMINDER_STORAGE_PREFIX = 'fit-persona:measurement-reminder';
const PERMISSION_PROMPTED_KEY = 'fit-persona:notifications:permission-prompted';
const MEASUREMENT_REMINDER_HOUR = 20;
const PRE_SESSION_MEASUREMENT_REMINDER_MS = 30 * 60 * 1000;

type PendingNoticeStage = 'pending' | 'overdue';
type MeasurementReminderStage = 'previous-night' | 'pre-session';

type PwaNotificationOptions = NotificationOptions & {
  renotify?: boolean;
};

interface PendingLogNotificationInput {
  clientId: string;
  clientName: string;
  sessions: Session[];
}

function getNoticeStage(session: Session, now: number): PendingNoticeStage {
  return now - getSessionEndMillis(session) >= TWO_HOURS_MS ? 'overdue' : 'pending';
}

function getNoticeStorageKey(sessionId: string, stage: PendingNoticeStage): string {
  return `${NOTIFICATION_STORAGE_PREFIX}:${sessionId}:${stage}`;
}

function formatSessionDetails(session: Session): string {
  const date = session.date || 'Unscheduled';
  const time = session.start_time || 'No start time';
  const duration = session.duration_minutes || 60;
  const focus = session.focus || 'No focus';

  return `${date} at ${time} - ${duration}min - ${focus}`;
}

function toLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMeasurementReminderMillis(session: Session): number {
  const reminderDate = toLocalDate(session.date);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(MEASUREMENT_REMINDER_HOUR, 0, 0, 0);
  return reminderDate.getTime();
}

function getSessionStartMillis(session: Session): number {
  return new Date(`${session.date}T${session.start_time || '00:00'}:00`).getTime();
}

function getMeasurementReminderStorageKey(sessionId: string, stage: MeasurementReminderStage): string {
  return `${MEASUREMENT_REMINDER_STORAGE_PREFIX}:${sessionId}:${stage}`;
}

function getLegacyMeasurementReminderStorageKey(sessionId: string): string {
  return `${MEASUREMENT_REMINDER_STORAGE_PREFIX}:${sessionId}`;
}

function getSessionDayLabel(sessionDate: string, now: Date): string {
  const today = toLocalIsoDate(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (sessionDate === today) {
    return "Today's session";
  }

  if (sessionDate === toLocalIsoDate(tomorrow)) {
    return "Tomorrow's session";
  }

  return `Session on ${sessionDate}`;
}

function formatMeasurementReminderBody(session: Session, clientName: string, now: Date): string {
  const dayLabel = getSessionDayLabel(session.date, now);
  const time = session.start_time || 'scheduled time';
  const focus = session.focus ? ` - ${session.focus}` : '';

  return `${dayLabel} with ${clientName}: take progress measurements at ${time}${focus}.`;
}

function formatPreSessionMeasurementReminderBody(session: Session, clientName: string): string {
  const time = session.start_time || 'scheduled time';
  const focus = session.focus ? ` - ${session.focus}` : '';

  return `${clientName}'s session starts in 30 minutes. Take progress measurements at ${time}${focus}.`;
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (window.Notification.permission === 'granted') {
    return true;
  }

  if (window.Notification.permission === 'denied') {
    return false;
  }

  if (window.localStorage.getItem(PERMISSION_PROMPTED_KEY)) {
    return false;
  }

  try {
    window.localStorage.setItem(PERMISSION_PROMPTED_KEY, new Date().toISOString());
    return await window.Notification.requestPermission() === 'granted';
  } catch {
    return false;
  }
}

async function showPwaNotification(
  title: string,
  options: PwaNotificationOptions,
): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if ('showNotification' in registration) {
      await registration.showNotification(title, options);
      return;
    }
  }

  const notification = new window.Notification(title, options);
  notification.onclick = () => {
    const targetUrl = options.data?.url || '/';
    window.focus();
    window.location.assign(targetUrl);
    notification.close();
  };
  window.setTimeout(() => notification.close(), 8000);
}

export async function notifyPendingLogSessions({
  clientId,
  clientName,
  sessions,
}: PendingLogNotificationInput): Promise<void> {
  if (sessions.length === 0 || !await ensureNotificationPermission()) {
    return;
  }

  const now = Date.now();

  for (const session of sessions) {
    const stage = getNoticeStage(session, now);
    const key = getNoticeStorageKey(session.id, stage);
    if (window.localStorage.getItem(key)) {
      continue;
    }

    window.localStorage.setItem(key, new Date().toISOString());

    await showPwaNotification(
      stage === 'overdue' ? 'Still Pending Log Entry' : 'Pending Log Entry',
      {
        body: `${clientName || 'Client'} - ${formatSessionDetails(session)}`,
        tag: key,
        renotify: stage === 'overdue',
        icon: '/fit-icon-192.png',
        badge: '/fit-icon-192.png',
        data: {
          clientId,
          sessionId: session.id,
          url: `/client/${clientId}`,
        },
      },
    );
  }
}

export async function notifyScheduledMeasurementReminders(): Promise<void> {
  if (!await ensureNotificationPermission()) {
    return;
  }

  const now = new Date();
  const nowMillis = now.getTime();
  const sessions = await db.sessions
    .where('status')
    .equals('planned')
    .filter((session) => Boolean(session.measure_reminder))
    .toArray();

  const reminders = sessions.flatMap((session) => {
    const sessionStartMillis = getSessionStartMillis(session);
    const previousNightKey = getMeasurementReminderStorageKey(session.id, 'previous-night');
    const preSessionKey = getMeasurementReminderStorageKey(session.id, 'pre-session');
    const legacyKey = getLegacyMeasurementReminderStorageKey(session.id);
    const items: Array<{ session: Session; stage: MeasurementReminderStage; key: string }> = [];

    if (
      nowMillis >= getMeasurementReminderMillis(session)
      && nowMillis < sessionStartMillis - PRE_SESSION_MEASUREMENT_REMINDER_MS
      && !window.localStorage.getItem(previousNightKey)
      && !window.localStorage.getItem(legacyKey)
    ) {
      items.push({ session, stage: 'previous-night', key: previousNightKey });
    }

    if (
      nowMillis >= sessionStartMillis - PRE_SESSION_MEASUREMENT_REMINDER_MS
      && nowMillis < sessionStartMillis
      && !window.localStorage.getItem(preSessionKey)
    ) {
      items.push({ session, stage: 'pre-session', key: preSessionKey });
    }

    return items;
  });

  if (reminders.length === 0) {
    return;
  }

  const clients = await db.clients.bulkGet(Array.from(new Set(reminders.map((reminder) => reminder.session.client_id))));
  const clientsById = new Map(clients.filter(Boolean).map((client) => [client!.id, client!]));

  for (const { session, stage, key } of reminders) {
    const clientName = clientsById.get(session.client_id)?.name || 'Client';
    window.localStorage.setItem(key, new Date().toISOString());

    await showPwaNotification('Measurement Reminder', {
      body: stage === 'pre-session'
        ? formatPreSessionMeasurementReminderBody(session, clientName)
        : formatMeasurementReminderBody(session, clientName, now),
      tag: key,
      renotify: stage === 'pre-session',
      icon: '/fit-icon-192.png',
      badge: '/fit-icon-192.png',
      data: {
        clientId: session.client_id,
        sessionId: session.id,
        url: `/client/${session.client_id}`,
      },
    });
  }
}
