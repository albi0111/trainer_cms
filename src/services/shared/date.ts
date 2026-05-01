export function nowIsoUtc(): string {
  return new Date().toISOString().split('.')[0] + 'Z';
}

export function todayLocalIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDayName(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
  }).toLowerCase();
}

export function compareDateTimes(date: string, startTime = '00:00'): number {
  return new Date(`${date}T${startTime}:00`).getTime();
}
