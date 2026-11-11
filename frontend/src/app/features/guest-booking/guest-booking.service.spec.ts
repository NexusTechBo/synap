import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApplicationRef, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { GuestApi } from '../../core/api/guest.api';
import { GuestSessionService } from '../../core/auth/guest-session.service';
import { API_ERROR_CODES } from '../../core/http/api-error';
import {
  ApiError,
  AvailableSlots,
  GuestAppointmentResponse,
  GuestBookingPatient,
  GuestDoctor,
  UnavailableDates,
} from '../../core/models/api.models';
import { addDays, toIso } from '../../core/utils/calendar.util';
import { DATE_STRIP_DAYS } from '../../shared/ui/forms/date-strip/date-strip.component';
import { GuestBookingService } from './guest-booking.service';

const TODAY = toIso(new Date());
const TOMORROW = toIso(addDays(new Date(), 1));
const IN_TWO_DAYS = toIso(addDays(new Date(), 2));
const LAST_STRIP_DAY = toIso(addDays(new Date(), DATE_STRIP_DAYS - 1));
const BEYOND_STRIP = toIso(addDays(new Date(), DATE_STRIP_DAYS + 5));

const PATIENT: GuestBookingPatient = { ci: '1234567', phoneNumber: '70000000' };

function guestDoctor(overrides: Partial<GuestDoctor> = {}): GuestDoctor {
  return { id: 10, name: 'Dr. Gómez', specialtyId: 1, specialtyName: 'Cardiología', ...overrides };
}

function slots(...startTimes: string[]): AvailableSlots {
  return {
    date: TODAY,
    doctorId: 10,
    availableSlots: startTimes.map((startTime) => ({
      startTime: `${startTime}:00`,
      endTime: `${startTime.slice(0, 2)}:30:00`,
    })),
  };
}

function unavailable(...unavailableDates: string[]): UnavailableDates {
  return { doctorId: 10, from: TODAY, to: LAST_STRIP_DAY, unavailableDates };
}

function result(): GuestAppointmentResponse {
  return {
    appointmentId: 99,
    doctorName: 'Dr. Gómez',
    specialtyName: 'Cardiología',
    startTime: `${TODAY}T09:00:00`,
    endTime: `${TODAY}T09:30:00`,
    status: 'PENDING',
  };
}

function apiError(status: number, body: Partial<ApiError>, headers?: HttpHeaders) {
  return new HttpErrorResponse({ status, headers, error: { status, message: 'Error', ...body } });
}

describe('GuestBookingService', () => {
  let service: GuestBookingService;
  let guestApi: {
    clinic: ReturnType<typeof vi.fn>;
    specialties: ReturnType<typeof vi.fn>;
    doctors: ReturnType<typeof vi.fn>;
    availableSlots: ReturnType<typeof vi.fn>;
    unavailableDates: ReturnType<typeof vi.fn>;
    book: ReturnType<typeof vi.fn>;
  };
  let ready: WritableSignal<boolean>;

  async function settle(): Promise<void> {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  function setup(sessionReady = true): void {
    ready = signal(sessionReady);
    guestApi = {
      clinic: vi.fn(() => of({ name: 'Clínica Sur', slug: 'sur' })),
      specialties: vi.fn(() =>
        of([
          { id: 2, name: 'Pediatría' },
          { id: 1, name: 'Cardiología' },
        ]),
      ),
      doctors: vi.fn(() => of([guestDoctor()])),
      availableSlots: vi.fn(() => of(slots('09:00', '10:00'))),
      unavailableDates: vi.fn(() => of(unavailable())),
      book: vi.fn(() => of(result())),
    };
    TestBed.configureTestingModule({
      providers: [
        GuestBookingService,
        { provide: GuestApi, useValue: guestApi },
        { provide: GuestSessionService, useValue: { ready } },
      ],
    });
    service = TestBed.inject(GuestBookingService);
  }

  async function reachSummary(): Promise<void> {
    await settle();
    service.selectDoctor(guestDoctor());
    await settle();
    service.selectSlot(service.slots()[0]);
    service.setPatient(PATIENT);
  }

  afterEach(() => vi.useRealTimers());

  describe('catalogs', () => {
    it('waits for the guest session before loading anything', async () => {
      setup(false);
      await settle();
      expect(guestApi.clinic).not.toHaveBeenCalled();
      expect(guestApi.specialties).not.toHaveBeenCalled();
      expect(guestApi.doctors).not.toHaveBeenCalled();
      expect(service.clinicName()).toBeNull();
    });

    it('loads clinic, sorted specialties and doctors once the session is ready', async () => {
      setup(false);
      ready.set(true);
      await settle();
      expect(service.clinicName()).toBe('Clínica Sur');
      expect(service.specialties().map((s) => s.name)).toEqual(['Cardiología', 'Pediatría']);
      expect(guestApi.doctors).toHaveBeenCalledWith(undefined);
      expect(service.doctors()).toEqual([guestDoctor()]);
    });

    it('filters doctors by specialty', async () => {
      setup();
      await settle();
      service.selectSpecialty(2);
      await settle();
      expect(guestApi.doctors).toHaveBeenLastCalledWith(2);
    });

    it('exposes the clinic error message', async () => {
      setup();
      guestApi.clinic.mockReturnValue(throwError(() => new Error('x')));
      service.reloadClinic();
      await settle();
      expect(service.clinicErrorMessage()).toBe('No se pudo cargar la clínica');
    });
  });

  describe('wizard steps', () => {
    it('starts on the doctor step', () => {
      setup();
      expect(service.step()).toBe('doctor');
      expect(service.stepNumber()).toBe(1);
      expect(service.totalSteps).toBe(4);
    });

    it('advances from doctor to slot, patient and summary', async () => {
      setup();
      await reachSummary();
      expect(service.step()).toBe('summary');
      expect(service.stepNumber()).toBe(4);
      expect(service.patient()).toEqual(PATIENT);
    });

    it('loads formatted slots for the selected doctor and date', async () => {
      setup();
      await settle();
      service.selectDoctor(guestDoctor());
      service.selectDate(TOMORROW);
      await settle();
      expect(guestApi.availableSlots).toHaveBeenLastCalledWith(10, TOMORROW);
      expect(service.slots()).toEqual([
        { startTime: '09:00', endTime: '09:30' },
        { startTime: '10:00', endTime: '10:30' },
      ]);
    });

    it('ignores past dates', () => {
      setup();
      service.selectDate('2000-01-01');
      expect(service.selectedDate()).toBe(TODAY);
    });

    it('goes back one step', async () => {
      setup();
      await reachSummary();
      service.back();
      expect(service.step()).toBe('patient');
    });

    it('does not go back from the first step or from done', async () => {
      setup();
      service.back();
      expect(service.step()).toBe('doctor');

      await reachSummary();
      service.book();
      expect(service.step()).toBe('done');
      service.back();
      expect(service.step()).toBe('done');
    });

    it('clears the doctor when switching to another specialty', () => {
      setup();
      service.selectDoctor(guestDoctor({ specialtyId: 1 }));
      service.selectSpecialty(2);
      expect(service.selectedDoctor()).toBeNull();
    });

    it('keeps the doctor when selecting their specialty', () => {
      setup();
      service.selectDoctor(guestDoctor({ specialtyId: 1 }));
      service.selectSpecialty(1);
      expect(service.selectedDoctor()?.id).toBe(10);
    });

    it('resets the selection when booking another appointment', async () => {
      setup();
      await reachSummary();
      service.book();

      service.bookAnother();

      expect(service.step()).toBe('doctor');
      expect(service.result()).toBeNull();
      expect(service.selectedDoctor()).toBeNull();
      expect(service.selectedSlot()).toBeNull();
      expect(service.selectedDate()).toBe(TODAY);
    });
  });

  describe('book', () => {
    it('does nothing without a complete selection', () => {
      setup();
      service.book();
      expect(guestApi.book).not.toHaveBeenCalled();
    });

    it('books and shows the result on success', async () => {
      setup();
      await reachSummary();

      service.book();

      expect(guestApi.book).toHaveBeenCalledWith({
        doctorId: 10,
        startTime: `${TODAY}T09:00:00`,
        patient: PATIENT,
      });
      expect(service.result()).toEqual(result());
      expect(service.step()).toBe('done');
      expect(service.submitting()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('ignores a second submit while booking', async () => {
      setup();
      await reachSummary();
      guestApi.book.mockReturnValue(new Subject());

      service.book();
      service.book();

      expect(service.submitting()).toBe(true);
      expect(guestApi.book).toHaveBeenCalledOnce();
    });

    it('shows the API message and stays on the summary for a generic error', async () => {
      setup();
      await reachSummary();
      guestApi.book.mockReturnValue(
        throwError(() => apiError(400, { message: 'Teléfono inválido' })),
      );

      service.book();

      expect(service.error()).toBe('Teléfono inválido');
      expect(service.step()).toBe('summary');
      expect(service.submitting()).toBe(false);
    });

    it('treats the guest active appointment conflict as a plain error', async () => {
      setup();
      await reachSummary();
      guestApi.availableSlots.mockClear();
      guestApi.book.mockReturnValue(
        throwError(() =>
          apiError(409, {
            code: API_ERROR_CODES.patientHasActiveGuest,
            message: 'Ya tienes una cita activa con este doctor',
            details: { startTime: `${TOMORROW}T09:00:00`, status: 'PENDING' },
          }),
        ),
      );

      service.book();

      expect(service.error()).toBe('Ya tienes una cita activa con este doctor');
      expect(service.step()).toBe('summary');
      expect(guestApi.availableSlots).not.toHaveBeenCalled();
    });

    it('treats a 409 without a slot code as a plain error', async () => {
      setup();
      await reachSummary();
      guestApi.availableSlots.mockClear();
      guestApi.book.mockReturnValue(throwError(() => apiError(409, { message: 'Conflicto' })));

      service.book();

      expect(service.error()).toBe('Conflicto');
      expect(service.step()).toBe('summary');
      expect(guestApi.availableSlots).not.toHaveBeenCalled();
    });

    it('returns to the slot step and clears the slot when it was taken', async () => {
      setup();
      await reachSummary();
      guestApi.availableSlots.mockReturnValue(of(slots('10:00')));
      guestApi.book.mockReturnValue(
        throwError(() =>
          apiError(409, { code: API_ERROR_CODES.slotTaken, message: 'Horario ocupado' }),
        ),
      );

      service.book();

      expect(service.step()).toBe('slot');
      expect(service.error()).toBe('Horario ocupado');
      expect(service.selectedSlot()).toBeNull();
      expect(service.slots()).toEqual([{ startTime: '10:00', endTime: '10:30' }]);
    });

    it('returns to the patient step keeping the slot when it is still free', async () => {
      setup();
      await reachSummary();
      guestApi.book.mockReturnValue(
        throwError(() =>
          apiError(409, { code: API_ERROR_CODES.outOfJourney, message: 'Fuera de horario' }),
        ),
      );

      service.book();

      expect(service.step()).toBe('patient');
      expect(service.error()).toBe('Fuera de horario');
      expect(service.selectedSlot()).toEqual({ startTime: '09:00', endTime: '09:30' });
    });

    it('returns to the slot step when refreshing the slots also fails', async () => {
      setup();
      await reachSummary();
      guestApi.availableSlots.mockReturnValue(throwError(() => new Error('offline')));
      guestApi.book.mockReturnValue(
        throwError(() =>
          apiError(409, { code: API_ERROR_CODES.scheduleBlocked, message: 'Agenda bloqueada' }),
        ),
      );

      service.book();
      await settle();

      expect(service.step()).toBe('slot');
      expect(service.error()).toBe('Agenda bloqueada');
      expect(service.selectedSlot()).toBeNull();
    });

    it('ignores the slot refresh when the user changed doctor meanwhile', async () => {
      setup();
      await reachSummary();
      const refreshed = new Subject<AvailableSlots>();
      guestApi.availableSlots.mockReturnValue(refreshed);
      guestApi.book.mockReturnValue(
        throwError(() => apiError(409, { code: API_ERROR_CODES.slotTaken, message: 'Ocupado' })),
      );

      service.book();
      service.bookAnother();
      refreshed.next(slots('10:00'));
      refreshed.complete();

      expect(service.step()).toBe('doctor');
      expect(service.error()).toBeNull();
    });
  });

  describe('unavailable dates', () => {
    function slotTaken() {
      return apiError(409, { code: API_ERROR_CODES.slotTaken, message: 'Horario ocupado' });
    }

    it('requests nothing until there is a session and a selected doctor', async () => {
      setup(false);
      service.selectDoctor(guestDoctor());
      await settle();
      expect(guestApi.unavailableDates).not.toHaveBeenCalled();

      ready.set(true);
      await settle();
      expect(guestApi.unavailableDates).toHaveBeenCalledOnce();
    });

    it('makes a single request covering the whole strip', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW, IN_TWO_DAYS)));
      await settle();

      service.selectDoctor(guestDoctor());
      await settle();

      expect(guestApi.unavailableDates).toHaveBeenCalledOnce();
      expect(guestApi.unavailableDates).toHaveBeenCalledWith(10, TODAY, LAST_STRIP_DAY);
      expect(service.unavailableDates()).toEqual([TOMORROW, IN_TWO_DAYS]);
    });

    it('does not request again when only the date changes', async () => {
      setup();
      await settle();
      service.selectDoctor(guestDoctor());
      await settle();

      service.selectDate(TOMORROW);
      await settle();

      expect(guestApi.unavailableDates).toHaveBeenCalledOnce();
    });

    it('adds a date beyond the strip when its slots come back empty', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW)));
      await settle();
      service.selectDoctor(guestDoctor());
      await settle();
      guestApi.availableSlots.mockReturnValue(of(slots()));

      service.selectDate(BEYOND_STRIP);
      await settle();

      expect(service.unavailableDates()).toEqual([TOMORROW, BEYOND_STRIP]);
    });

    it('does not repeat the selected date when the backend already reports it', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW)));
      await settle();
      service.selectDoctor(guestDoctor());
      await settle();
      guestApi.availableSlots.mockReturnValue(of(slots()));

      service.selectDate(TOMORROW);
      await settle();

      expect(service.unavailableDates()).toEqual([TOMORROW]);
    });

    it('jumps to the first strip day with slots when the selected day has none', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TODAY, TOMORROW)));
      await settle();

      service.selectDoctor(guestDoctor());
      await settle();

      expect(service.selectedDate()).toBe(IN_TWO_DAYS);
      expect(guestApi.availableSlots).toHaveBeenLastCalledWith(10, IN_TWO_DAYS);
    });

    it('keeps the selected day when it has slots', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW)));
      await settle();

      service.selectDoctor(guestDoctor());
      await settle();

      expect(service.selectedDate()).toBe(TODAY);
    });

    it('keeps the selected day when no strip day has slots', async () => {
      setup();
      const allStripDays = Array.from({ length: DATE_STRIP_DAYS }, (_, i) =>
        toIso(addDays(new Date(), i)),
      );
      guestApi.unavailableDates.mockReturnValue(of(unavailable(...allStripDays)));
      await settle();

      service.selectDoctor(guestDoctor());
      await settle();

      expect(service.selectedDate()).toBe(TODAY);
    });

    it('does not jump when the dates are refreshed after a slot conflict', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW)));
      await reachSummary();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TODAY, TOMORROW)));
      guestApi.availableSlots.mockReturnValue(of(slots()));
      guestApi.book.mockReturnValue(
        throwError(() =>
          apiError(409, { code: API_ERROR_CODES.slotTaken, message: 'Horario ocupado' }),
        ),
      );

      service.book();
      await settle();

      expect(service.selectedDate()).toBe(TODAY);
      expect(service.step()).toBe('slot');
    });

    it('jumps again when the same doctor is selected after going back', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TODAY)));
      await settle();
      service.selectDoctor(guestDoctor());
      await settle();
      service.selectDate(TODAY);
      service.back();

      service.selectDoctor(guestDoctor());
      await settle();

      expect(service.selectedDate()).toBe(TOMORROW);
    });

    it('does not mark the selected date while its slots are loading', async () => {
      setup();
      const pending = new Subject<AvailableSlots>();
      guestApi.availableSlots.mockReturnValue(pending);
      await settle();

      service.selectDoctor(guestDoctor());
      TestBed.tick();
      expect(service.slotsLoading()).toBe(true);
      expect(service.unavailableDates()).toEqual([]);

      pending.next(slots());
      pending.complete();
      await settle();
      expect(service.unavailableDates()).toEqual([TODAY]);
    });

    it('does not mark the selected date on a slots error', async () => {
      setup();
      guestApi.availableSlots.mockReturnValue(throwError(() => new Error('offline')));
      await settle();

      service.selectDoctor(guestDoctor());
      await settle();

      expect(service.slotsErrorMessage()).toBeTruthy();
      expect(service.unavailableDates()).toEqual([]);
    });

    it('does not carry empty slots of the previous date over to the new one', async () => {
      setup();
      guestApi.availableSlots.mockReturnValue(of(slots()));
      await settle();
      service.selectDoctor(guestDoctor());
      await settle();
      expect(service.unavailableDates()).toEqual([TODAY]);
      guestApi.availableSlots.mockReturnValue(new Subject<AvailableSlots>());

      service.selectDate(TOMORROW);

      expect(service.unavailableDates()).toEqual([]);
      TestBed.tick();
      expect(service.unavailableDates()).toEqual([]);
    });

    it('does not mark the selected date while retrying empty slots', async () => {
      setup();
      guestApi.availableSlots.mockReturnValue(of(slots()));
      await settle();
      service.selectDoctor(guestDoctor());
      await settle();
      guestApi.availableSlots.mockReturnValue(new Subject<AvailableSlots>());

      service.reloadSlots();
      TestBed.tick();

      expect(service.unavailableDates()).toEqual([]);
    });

    it('marks the day and refreshes when a slot conflict empties it', async () => {
      setup();
      guestApi.availableSlots.mockReturnValue(of(slots('09:00')));
      await reachSummary();
      expect(service.unavailableDates()).toEqual([]);
      guestApi.unavailableDates.mockClear();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TODAY, TOMORROW)));
      guestApi.availableSlots.mockReturnValue(of(slots()));
      guestApi.book.mockReturnValue(throwError(() => slotTaken()));

      service.book();

      expect(service.step()).toBe('slot');
      expect(service.unavailableDates()).toEqual([TODAY]);

      await settle();
      expect(guestApi.unavailableDates).toHaveBeenCalledOnce();
      expect(service.unavailableDates()).toEqual([TODAY, TOMORROW]);
    });

    it('keeps the known dates while a conflict refresh is in flight', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW)));
      await reachSummary();
      guestApi.unavailableDates.mockReturnValue(new Subject<UnavailableDates>());
      guestApi.book.mockReturnValue(throwError(() => slotTaken()));

      service.book();
      TestBed.tick();

      expect(service.unavailableDates()).toEqual([TOMORROW]);
    });

    it('does not refresh on errors that say nothing about availability', async () => {
      setup();
      await reachSummary();
      guestApi.unavailableDates.mockClear();
      guestApi.book.mockReturnValue(throwError(() => apiError(409, { message: 'Conflicto' })));

      service.book();
      await settle();

      expect(guestApi.unavailableDates).not.toHaveBeenCalled();
    });

    it('fetches fresh dates when booking another appointment with the same doctor', async () => {
      setup();
      await reachSummary();
      service.book();
      await settle();
      service.bookAnother();
      await settle();
      expect(service.unavailableDates()).toEqual([]);
      guestApi.unavailableDates.mockClear();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TODAY)));

      service.selectDoctor(guestDoctor());
      await settle();

      expect(guestApi.unavailableDates).toHaveBeenCalledOnce();
      expect(service.unavailableDates()).toEqual([TODAY]);
    });

    it('drops the previous doctor dates at once when the doctor changes', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW)));
      await settle();
      service.selectDoctor(guestDoctor());
      await settle();
      expect(service.unavailableDates()).toEqual([TOMORROW]);
      const pending = new Subject<UnavailableDates>();
      guestApi.unavailableDates.mockReturnValue(pending);

      service.selectDoctor(guestDoctor({ id: 20 }));

      expect(service.unavailableDates()).toEqual([]);
      TestBed.tick();
      expect(guestApi.unavailableDates).toHaveBeenLastCalledWith(20, TODAY, LAST_STRIP_DAY);
      expect(service.unavailableDates()).toEqual([]);

      pending.next(unavailable(IN_TWO_DAYS));
      pending.complete();
      await settle();
      expect(service.unavailableDates()).toEqual([IN_TWO_DAYS]);
    });

    it('ignores a late answer for the previous doctor', async () => {
      setup();
      const first = new Subject<UnavailableDates>();
      guestApi.unavailableDates.mockReturnValue(first);
      await settle();
      service.selectDoctor(guestDoctor());
      TestBed.tick();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(IN_TWO_DAYS)));

      service.selectDoctor(guestDoctor({ id: 20 }));
      await settle();
      first.next(unavailable(TOMORROW));

      expect(service.unavailableDates()).toEqual([IN_TWO_DAYS]);
    });

    it('keeps the page working with no disabled days when the request fails', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(throwError(() => new Error('offline')));

      await reachSummary();

      expect(service.unavailableDates()).toEqual([]);
      expect(service.error()).toBeNull();
      expect(service.slotsErrorMessage()).toBeNull();
      expect(service.step()).toBe('summary');

      service.book();
      expect(service.step()).toBe('done');
      expect(service.error()).toBeNull();
    });

    it('still marks an empty selected date when the request fails', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(throwError(() => new Error('offline')));
      guestApi.availableSlots.mockReturnValue(of(slots()));
      await settle();

      service.selectDoctor(guestDoctor());
      await settle();

      expect(service.unavailableDates()).toEqual([TODAY]);
      expect(service.error()).toBeNull();
    });

    it('shows only the conflict message when the refresh after it fails', async () => {
      setup();
      guestApi.unavailableDates.mockReturnValue(of(unavailable(TOMORROW)));
      await reachSummary();
      guestApi.unavailableDates.mockReturnValue(throwError(() => new Error('offline')));
      guestApi.availableSlots.mockReturnValue(of(slots('10:00')));
      guestApi.book.mockReturnValue(throwError(() => slotTaken()));

      service.book();
      await settle();

      expect(service.error()).toBe('Horario ocupado');
      expect(service.step()).toBe('slot');
      expect(service.unavailableDates()).toEqual([]);
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      vi.useFakeTimers({
        toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
      });
    });

    function rateLimited() {
      return apiError(
        429,
        { message: 'Demasiadas reservas' },
        new HttpHeaders({ 'Retry-After': '3' }),
      );
    }

    it('starts a cooldown and shows the message on the summary', async () => {
      setup();
      await reachSummary();
      guestApi.book.mockReturnValue(throwError(() => rateLimited()));

      service.book();

      expect(service.coolingDown()).toBe(true);
      expect(service.retryInLabel()).toBe('3 s');
      expect(service.error()).toBe('Demasiadas reservas');
      expect(service.step()).toBe('summary');
    });

    it('blocks booking during the cooldown and allows it afterwards', async () => {
      setup();
      await reachSummary();
      guestApi.book.mockReturnValue(throwError(() => rateLimited()));
      service.book();
      guestApi.book.mockClear();
      guestApi.book.mockReturnValue(of(result()));

      service.book();
      expect(guestApi.book).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);
      expect(service.coolingDown()).toBe(false);
      expect(service.cooldownFinished()).toBe(true);
      expect(service.error()).toBeNull();

      service.book();
      expect(guestApi.book).toHaveBeenCalledOnce();
      expect(service.step()).toBe('done');
    });

    it('hides the rate limit message outside the summary step', async () => {
      setup();
      await reachSummary();
      guestApi.book.mockReturnValue(throwError(() => rateLimited()));
      service.book();

      service.back();

      expect(service.coolingDown()).toBe(true);
      expect(service.error()).toBeNull();
    });
  });
});
