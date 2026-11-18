import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, Signal } from '@angular/core';
import { I18nService } from '../i18n/i18n.service';
import {
  ActiveAppointmentStatus,
  ApiError,
  StaffActiveAppointmentConflict,
} from '../models/api.models';

export const API_ERROR_CODES = {
  slotTaken: 'appointment.slotTaken',
  scheduleBlocked: 'appointment.scheduleBlocked',
  outOfJourney: 'appointment.outOfJourney',
  pastDate: 'appointment.pastDate',
  patientHasActive: 'appointment.patientHasActive',
  patientHasActiveGuest: 'appointment.patientHasActiveGuest',
  activeAppointmentsConflict: 'scheduleException.activeAppointmentsConflict',
  doctorModeActiveAppointmentsConflict: 'personal.doctorModeActiveAppointmentsConflict',
} as const;

const SLOT_UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  API_ERROR_CODES.slotTaken,
  API_ERROR_CODES.scheduleBlocked,
  API_ERROR_CODES.outOfJourney,
  API_ERROR_CODES.pastDate,
]);

export function isRateLimited(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.TooManyRequests;
}

export function retryAfterSeconds(error: unknown): number {
  if (!isRateLimited(error)) return 0;
  const seconds = Number(error.headers.get('Retry-After'));
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 0;
}

export function apiErrorMessage(
  error: unknown,
  i18n: I18nService,
  fallback = i18n.translate('errors.unexpected'),
): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return i18n.translate('errors.connection');
  const body = error.error as Partial<ApiError> | string | null;
  if (body && typeof body === 'object') {
    const details = [...new Set((body.errors ?? []).map((e) => e.message).filter(Boolean))];
    if (details.length) return details.join('. ');
    if (body.message) return body.message;
  }
  return isRateLimited(error) ? i18n.translate('errors.rateLimited') : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isActiveStatus(value: unknown): value is ActiveAppointmentStatus {
  return value === 'PENDING' || value === 'CONFIRMED';
}

function errorBody(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  return isRecord(body) ? body : null;
}

export function apiErrorCode(error: unknown): string | null {
  const code = errorBody(error)?.['code'];
  return typeof code === 'string' && code ? code : null;
}

function apiErrorDetails(error: unknown): Record<string, unknown> {
  const details = errorBody(error)?.['details'];
  return isRecord(details) ? details : {};
}

export function isSlotUnavailableError(error: unknown): boolean {
  const code = apiErrorCode(error);
  return code !== null && SLOT_UNAVAILABLE_CODES.has(code);
}

export function activeAppointmentsConflict(error: unknown): number | null {
  if (apiErrorCode(error) !== API_ERROR_CODES.activeAppointmentsConflict) return null;
  const count = apiErrorDetails(error)['count'];
  return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : 0;
}

export function doctorModeAppointmentsConflict(error: unknown): number | null {
  if (apiErrorCode(error) !== API_ERROR_CODES.doctorModeActiveAppointmentsConflict) return null;
  const count = apiErrorDetails(error)['count'];
  return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : 0;
}

export function staffActiveAppointmentConflict(
  error: unknown,
): StaffActiveAppointmentConflict | null {
  if (apiErrorCode(error) !== API_ERROR_CODES.patientHasActive) return null;
  const { appointmentId, startTime, status } = apiErrorDetails(error);
  if (typeof appointmentId !== 'number' || typeof startTime !== 'string' || !isActiveStatus(status))
    return null;
  return { appointmentId, startTime, status };
}

export function resourceError(
  resource: { error(): unknown },
  i18n: I18nService,
  fallback: string,
): Signal<string | null> {
  return computed(() => {
    const error = resource.error();
    return error ? apiErrorMessage(error, i18n, fallback) : null;
  });
}
