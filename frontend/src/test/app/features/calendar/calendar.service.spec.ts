import { ApplicationRef, WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AppointmentsApi } from '../../../../app/core/api/appointments.api';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { ClinicClockService } from '../../../../app/core/clinic/clinic-clock.service';
import { CalendarService } from '../../../../app/features/calendar/calendar.service';
import { AppointmentActionsService } from '../../../../app/shared/services/appointment-actions.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let api: { calendar: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let route: { queryParamMap: BehaviorSubject<ReturnType<typeof convertToParamMap>> };
  let clockToday: WritableSignal<string>;

  async function settle(): Promise<void> {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  function setup(today = '2026-11-18', dateParam: string | null = null): void {
    clockToday = signal(today);
    api = { calendar: vi.fn(() => of({})) };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };
    route = {
      queryParamMap: new BehaviorSubject(convertToParamMap(dateParam ? { date: dateParam } : {})),
    };
    TestBed.configureTestingModule({
      providers: [
        CalendarService,
        { provide: AppointmentsApi, useValue: api },
        { provide: AppointmentActionsService, useValue: {} },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: AuthService, useValue: { hasRole: () => false, userId: signal(1) } },
        { provide: ClinicClockService, useValue: { today: () => clockToday() } },
      ],
    });
    service = TestBed.inject(CalendarService);
  }

  describe('selected date', () => {
    it('follows today when there is no date query param', () => {
      setup();
      expect(service.selectedDate()).toBe('2026-11-18');

      clockToday.set('2026-11-19');

      expect(service.selectedDate()).toBe('2026-11-19');
    });

    it('keeps the date from the query param when the day changes', () => {
      setup('2026-11-18', '2026-11-18');

      clockToday.set('2026-11-19');

      expect(service.selectedDate()).toBe('2026-11-18');
    });

    it('ignores an invalid query param and uses today', () => {
      setup('2026-11-18', '2026-02-30');

      expect(service.selectedDate()).toBe('2026-11-18');
    });

    it('allows creating on the selected date only from today onwards', () => {
      setup('2026-11-18', '2026-11-18');
      expect(service.canCreateOnSelected()).toBe(true);

      clockToday.set('2026-11-19');

      expect(service.canCreateOnSelected()).toBe(false);
    });

    it('loads the month of the new today when the month changes', async () => {
      setup('2026-11-30');
      await settle();
      api.calendar.mockClear();

      clockToday.set('2026-12-01');
      await settle();

      expect(api.calendar).toHaveBeenCalledOnce();
      expect(api.calendar).toHaveBeenCalledWith({ month: 12, year: 2026, doctorId: undefined });
    });
  });

  describe('select', () => {
    it('removes the date param when selecting today', () => {
      setup();

      service.select('2026-11-18');

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: { date: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    it('writes the date param when selecting another date', () => {
      setup();

      service.select('2026-11-25');

      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: route,
        queryParams: { date: '2026-11-25' },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    it('writes the date param for the previous day once the day changed', () => {
      setup();
      clockToday.set('2026-11-19');

      service.select('2026-11-18');

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { date: '2026-11-18' } }),
      );
    });

    it('removes the date param when selecting the new today after the day changed', () => {
      setup();
      clockToday.set('2026-11-19');

      service.select('2026-11-19');

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { date: null } }),
      );
    });
  });

  describe('goToday', () => {
    it('removes the date param', () => {
      setup('2026-11-18', '2026-11-25');

      service.goToday();

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { date: null }, queryParamsHandling: 'merge' }),
      );
    });

    it('goes to the new today after the day changed', () => {
      setup('2026-11-18', '2026-11-25');
      clockToday.set('2026-11-19');

      service.goToday();

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { date: null } }),
      );
    });
  });

  describe('shiftMonth', () => {
    it('selects the first day of the next month', () => {
      setup();

      service.shiftMonth(1);

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { date: '2026-12-01' } }),
      );
    });

    it('selects the first day of the previous month', () => {
      setup();

      service.shiftMonth(-1);

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { date: '2026-10-01' } }),
      );
    });

    it('removes the date param when returning to the month of today', () => {
      setup('2026-11-18', '2026-12-10');

      service.shiftMonth(-1);

      expect(router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { date: null } }),
      );
    });
  });
});
