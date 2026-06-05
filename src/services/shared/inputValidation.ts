const OPTIONAL_PHONE_DIGITS_MIN = 10;
const OPTIONAL_PHONE_DIGITS_MAX = 15;
const SESSION_WINDOW_START_MINUTES = 5 * 60;
const SESSION_WINDOW_END_MINUTES = 23 * 60;

export function normalizeOptionalContactValue(value?: string | null): string {
  return value?.trim() || '';
}

export function isValidOptionalPhone(value?: string | null): boolean {
  const normalized = normalizeOptionalContactValue(value);
  if (!normalized) {
    return true;
  }

  if (!/^\+?[0-9\s\-()]+$/.test(normalized)) {
    return false;
  }

  const digitsOnly = normalized.replace(/\D/g, '');
  return digitsOnly.length >= OPTIONAL_PHONE_DIGITS_MIN && digitsOnly.length <= OPTIONAL_PHONE_DIGITS_MAX;
}

export function isValidOptionalEmail(value?: string | null): boolean {
  const normalized = normalizeOptionalContactValue(value);
  if (!normalized) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function validateOptionalClientContact(input: {
  phone?: string | null;
  email?: string | null;
}): void {
  if (!isValidOptionalPhone(input.phone)) {
    throw new Error('Enter a valid phone number.');
  }

  if (!isValidOptionalEmail(input.email)) {
    throw new Error('Enter a valid email.');
  }
}

export function parseTimeToMinutes(value?: string | null): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hoursString, minutesString] = value.split(':');
  const hours = Number(hoursString);
  const minutes = Number(minutesString);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function validateSessionTimeWindow(startTime?: string | null, endTime?: string | null): void {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    throw new Error('Start time and end time are required.');
  }

  if (startMinutes < SESSION_WINDOW_START_MINUTES) {
    throw new Error('Select a session time between 05:00 AM and 11:00 PM.');
  }

  if (endMinutes > SESSION_WINDOW_END_MINUTES) {
    throw new Error('Select a session time between 05:00 AM and 11:00 PM.');
  }

  if (endMinutes <= startMinutes) {
    throw new Error('End time must be later than start time.');
  }
}
