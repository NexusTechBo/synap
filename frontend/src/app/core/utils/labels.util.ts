import { AppointmentStatus, DayOfWeek } from '../models/api.models';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'CANCELLED'];

export const STATUS_STYLE: Record<AppointmentStatus, { dot: string; badge: string }> = {
  PENDING: { dot: 'bg-tertiary', badge: 'bg-tertiary/10 text-tertiary' },
  CONFIRMED: { dot: 'bg-primary', badge: 'bg-primary/10 text-primary' },
  CANCELLED: { dot: 'bg-gray-400', badge: 'bg-gray-900/[0.06] text-gray-500' },
};

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

function nameWords(name: string): string[] {
  return name
    .replace(/^(dr|dra)\.?\s+/i, '')
    .trim()
    .split(/\s+/);
}

export function firstName(name: string): string {
  return nameWords(name)[0] ?? '';
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const words = nameWords(name);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
}
