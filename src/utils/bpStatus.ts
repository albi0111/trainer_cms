export type BpStatus = 'low' | 'normal' | 'high';

export function getBpStatus(systolic?: number | null, diastolic?: number | null): BpStatus | null {
  if (!systolic || !diastolic) {
    return null;
  }

  if (systolic < 90 || diastolic < 60) {
    return 'low';
  }

  if (systolic >= 130 || diastolic >= 80) {
    return 'high';
  }

  return 'normal';
}

export function getBpStatusLabel(status: BpStatus): string {
  if (status === 'high') {
    return 'High BP';
  }

  if (status === 'low') {
    return 'Low BP';
  }

  return 'Normal BP';
}
