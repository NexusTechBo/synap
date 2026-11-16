import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../core/i18n/i18n.service';
import { Patient, PatientActiveAppointmentConflict } from '../../core/models/api.models';
import { BookingAttempt } from './booking.model';
import { rescheduleConfirmOptions } from './booking.util';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 20,
    ci: '1234567',
    name: 'Ana Pérez',
    email: null,
    phoneNumber: '70000000',
    active: true,
    ...overrides,
  };
}

function attempt(overrides: Partial<BookingAttempt> = {}): BookingAttempt {
  return {
    doctor: { id: 10, name: 'Dr. Gómez', specialtyId: 1, specialtyName: 'Cardiología' },
    patient: patient(),
    date: '2026-11-12',
    startDateTime: '2026-11-12T11:30:00',
    ...overrides,
  };
}

function conflict(
  overrides: Partial<PatientActiveAppointmentConflict> = {},
): PatientActiveAppointmentConflict {
  return { appointmentId: 7, startTime: '2026-11-05T09:00:00', status: 'CONFIRMED', ...overrides };
}

describe('rescheduleConfirmOptions', () => {
  let i18n: I18nService;

  beforeEach(async () => {
    localStorage.setItem('lang', 'es');
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
    await i18n.init();
  });

  afterEach(() => localStorage.removeItem('lang'));

  it('builds the reschedule confirmation title and label', () => {
    const options = rescheduleConfirmOptions(conflict(), attempt(), i18n);
    expect(options.title).toBe('Paciente con cita activa');
    expect(options.confirmLabel).toBe('Reprogramar');
    expect(options.danger).toBeUndefined();
  });

  it('describes the current and the new appointment in lowercase Spanish', () => {
    const options = rescheduleConfirmOptions(conflict(), attempt(), i18n);
    expect(options.message).toBe(
      'Ana Pérez ya tiene una cita confirmada con Dr. Gómez el jueves, 5 de noviembre de 2026 ' +
        'a las 09:00. ¿Deseas reprogramarla al jueves, 12 de noviembre de 2026 a las 11:30?',
    );
  });

  it('uses the pending label for a pending conflict', () => {
    const options = rescheduleConfirmOptions(conflict({ status: 'PENDING' }), attempt(), i18n);
    expect(options.message).toContain('ya tiene una cita pendiente con');
  });
});
