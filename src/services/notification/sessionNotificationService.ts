import type { Session } from '../../types';
import { getSessionEndMillis } from '../sessionService';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const NOTIFICATION_STORAGE_PREFIX = 'fit-persona:pending-log-notice';
const PERMISSION_PROMPTED_KEY = 'fit-persona:notifications:permission-prompted';

type PendingNoticeStage = 'pending' | 'overdue';

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
