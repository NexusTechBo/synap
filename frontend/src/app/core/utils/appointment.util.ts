import { AppointmentStatus, AppointmentSummaryItem } from '../models/api.models';
import { toLocalDateTime } from './calendar.util';

export function appointmentStartDateTime(appointment: AppointmentSummaryItem): string {
  return toLocalDateTime(appointment.appointmentDate, appointment.startTime);
}

export function hasAppointmentStarted(startTime: string, now: string): boolean {
  return startTime.slice(0, 19) <= now.slice(0, 19);
}

export function canConfirmAppointment(
  status: AppointmentStatus,
  startTime: string,
  now: string,
): boolean {
  return status === 'PENDING' && !hasAppointmentStarted(startTime, now);
}

export function canCancelAppointment(
  status: AppointmentStatus,
  startTime: string,
  now: string,
): boolean {
  return status !== 'CANCELLED' && !hasAppointmentStarted(startTime, now);
}
