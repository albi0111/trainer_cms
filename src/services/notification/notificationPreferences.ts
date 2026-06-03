const PUSH_NOTIFICATIONS_ENABLED_KEY = 'fit-persona:push-notifications:enabled';

export function arePushNotificationsEnabled(): boolean {
  return window.localStorage.getItem(PUSH_NOTIFICATIONS_ENABLED_KEY) === 'true';
}

export function setPushNotificationsEnabled(enabled: boolean): void {
  if (enabled) {
    window.localStorage.setItem(PUSH_NOTIFICATIONS_ENABLED_KEY, 'true');
    return;
  }

  window.localStorage.removeItem(PUSH_NOTIFICATIONS_ENABLED_KEY);
}
