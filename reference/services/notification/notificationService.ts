import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Session } from '../../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'web') return false;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

/**
 * Schedules 3 notifications for a session measurement reminder:
 * 1. Day before at 18:00
 * 2. Day of session at 08:00
 * 3. 1 hour before session start time
 */
export async function scheduleMeasurementReminders(session: Session, clientName: string) {
  if (Platform.OS === 'web') return;

  const { id: sessionId, date, start_time } = session;
  if (!sessionId || !date || !start_time) return;

  // Cancel any existing ones first to be safe
  await cancelMeasurementReminders(sessionId);

  const sessionDate = new Date(date);
  const [startH, startM] = start_time.split(':').map(Number);

  // 1. Day Before (18:00)
  const dayBefore = new Date(sessionDate);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(18, 0, 0, 0);

  if (dayBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `measure-${sessionId}-dayBefore`,
      content: {
        title: '📏 Measurement Reminder',
        body: `Take ${clientName}'s progress measurements after tomorrow's session`,
        data: { sessionId, clientId: session.client_id },
      },
      trigger: dayBefore as any,
    });
  }

  // 2. Day Of Morning (08:00)
  const morningOf = new Date(sessionDate);
  morningOf.setHours(8, 0, 0, 0);

  if (morningOf > new Date()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `measure-${sessionId}-morning`,
      content: {
        title: '📏 Measurement Day',
        body: `Remember to take ${clientName}'s progress measurements during today's session`,
        data: { sessionId, clientId: session.client_id },
      },
      trigger: morningOf as any,
    });
  }

  // 3. One Hour Before Session
  const hourBefore = new Date(sessionDate);
  hourBefore.setHours(startH - 1, startM, 0, 0);

  if (hourBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      identifier: `measure-${sessionId}-hourBefore`,
      content: {
        title: '📏 Session in 1 hour',
        body: `Don't forget ${clientName}'s progress measurements!`,
        data: { sessionId, clientId: session.client_id },
      },
      trigger: hourBefore as any,
    });
  }
}

export async function cancelMeasurementReminders(sessionId: string) {
  if (Platform.OS === 'web') return;
  
  await Notifications.cancelScheduledNotificationAsync(`measure-${sessionId}-dayBefore`);
  await Notifications.cancelScheduledNotificationAsync(`measure-${sessionId}-morning`);
  await Notifications.cancelScheduledNotificationAsync(`measure-${sessionId}-hourBefore`);
}
