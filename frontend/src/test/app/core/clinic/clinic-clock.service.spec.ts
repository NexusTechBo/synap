import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GuestSessionService } from '../../../../app/core/auth/guest-session.service';
import { ClinicClockService } from '../../../../app/core/clinic/clinic-clock.service';
import { ClinicRegionalSettingsStore } from '../../../../app/core/clinic/clinic-regional-settings.store';
import { ClinicRegionalSettings } from '../../../../app/core/models/api.models';

const SAO_PAULO = 'America/Sao_Paulo';
const LA_PAZ = 'America/La_Paz';

function settingsFor(timezone: string): ClinicRegionalSettings {
  return { country: 'BR', timezone, defaultLanguage: 'pt-BR' };
}

describe('ClinicClockService', () => {
  let staffSettings: ReturnType<typeof signal<ClinicRegionalSettings | null>>;
  let guestTimezone: ReturnType<typeof signal<string | null>>;
  let clock: ClinicClockService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T14:00:00Z'));
    staffSettings = signal<ClinicRegionalSettings | null>(null);
    guestTimezone = signal<string | null>(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: ClinicRegionalSettingsStore, useValue: { settings: staffSettings } },
        { provide: GuestSessionService, useValue: { timezone: guestTimezone } },
      ],
    });
    clock = TestBed.inject(ClinicClockService);
  });

  afterEach(() => vi.useRealTimers());

  it('formats now in the Sao Paulo clinic timezone', () => {
    staffSettings.set(settingsFor(SAO_PAULO));

    expect(clock.now()).toBe('2026-11-17T11:00:00');
  });

  it('formats now in the La Paz clinic timezone', () => {
    staffSettings.set(settingsFor(LA_PAZ));

    expect(clock.now()).toBe('2026-11-17T10:00:00');
  });

  it('returns the local date as yyyy-MM-dd', () => {
    staffSettings.set(settingsFor(SAO_PAULO));

    expect(clock.today()).toBe('2026-11-17');
  });

  it('returns the hour of the clinic timezone', () => {
    staffSettings.set(settingsFor(SAO_PAULO));

    expect(clock.hour()).toBe(11);
  });

  it('resolves different days for the same instant across timezones', () => {
    vi.setSystemTime(new Date('2026-11-18T03:30:00Z'));

    staffSettings.set(settingsFor(SAO_PAULO));
    expect(clock.today()).toBe('2026-11-18');

    staffSettings.set(settingsFor(LA_PAZ));
    expect(clock.today()).toBe('2026-11-17');
  });

  it('returns hour 0 at local midnight instead of 24', () => {
    vi.setSystemTime(new Date('2026-11-18T03:00:00Z'));
    staffSettings.set(settingsFor(SAO_PAULO));

    expect(clock.hour()).toBe(0);
    expect(clock.now()).toBe('2026-11-18T00:00:00');
  });

  it('prefers the staff clinic timezone over the guest timezone', () => {
    staffSettings.set(settingsFor(SAO_PAULO));
    guestTimezone.set(LA_PAZ);

    expect(clock.timezone()).toBe(SAO_PAULO);
  });

  it('uses the guest timezone when there are no staff settings', () => {
    guestTimezone.set(LA_PAZ);

    expect(clock.timezone()).toBe(LA_PAZ);
    expect(clock.now()).toBe('2026-11-17T10:00:00');
  });

  it('falls back to the browser timezone without staff or guest timezone', () => {
    expect(clock.timezone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('updates dependent computed values when the store timezone changes', () => {
    vi.setSystemTime(new Date('2026-11-18T03:30:00Z'));
    staffSettings.set(settingsFor(SAO_PAULO));
    const today = computed(() => {
      clock.timezone();
      return clock.today();
    });
    expect(today()).toBe('2026-11-18');

    staffSettings.set(settingsFor(LA_PAZ));

    expect(today()).toBe('2026-11-17');
  });

  describe('automatic refresh', () => {
    let visibility: DocumentVisibilityState;

    beforeEach(() => {
      visibility = 'visible';
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibility,
      });
    });

    afterEach(() => {
      Reflect.deleteProperty(document, 'visibilityState');
    });

    function startAt(instant: string, timezone: string): void {
      vi.setSystemTime(new Date(instant));
      staffSettings.set(settingsFor(timezone));
      TestBed.tick();
    }

    function showDocument(state: DocumentVisibilityState): void {
      visibility = state;
      document.dispatchEvent(new Event('visibilitychange'));
    }

    it('schedules a single timer for the next cutoff once the timezone is known', () => {
      startAt('2026-11-17T14:00:00Z', LA_PAZ);

      expect(vi.getTimerCount()).toBe(1);
    });

    it.each([
      ['La Paz', LA_PAZ, '2026-11-18T03:59:00Z', 60_000],
      ['Sao Paulo', SAO_PAULO, '2026-11-18T02:59:30Z', 30_000],
    ])(
      'advances today past midnight of the %s clinic',
      (_name, timezone, instant, untilMidnight) => {
        startAt(instant, timezone);
        const today = computed(() => clock.today());
        expect(today()).toBe('2026-11-17');

        vi.advanceTimersByTime(untilMidnight + 500);

        expect(today()).toBe('2026-11-18');
      },
    );

    it('waits for the safety margin after the cutoff before refreshing', () => {
      startAt('2026-11-18T03:59:00Z', LA_PAZ);
      const today = computed(() => clock.today());
      expect(today()).toBe('2026-11-17');

      vi.advanceTimersByTime(60_000);
      expect(today()).toBe('2026-11-17');

      vi.advanceTimersByTime(500);
      expect(today()).toBe('2026-11-18');
    });

    it('refreshes the hour at the 12:00 cutoff', () => {
      startAt('2026-11-17T15:59:00Z', LA_PAZ);
      const hour = computed(() => clock.hour());
      expect(hour()).toBe(11);

      vi.advanceTimersByTime(60_500);

      expect(hour()).toBe(12);
    });

    it('refreshes the hour at the 19:00 cutoff', () => {
      startAt('2026-11-17T22:59:30Z', LA_PAZ);
      const hour = computed(() => clock.hour());
      expect(hour()).toBe(18);

      vi.advanceTimersByTime(30_500);

      expect(hour()).toBe(19);
    });

    it('keeps scheduling after each refresh', () => {
      startAt('2026-11-17T15:59:00Z', LA_PAZ);
      const hour = computed(() => clock.hour());
      vi.advanceTimersByTime(60_500);
      expect(hour()).toBe(12);
      expect(vi.getTimerCount()).toBe(1);

      vi.advanceTimersByTime(7 * 3_600_000 + 500);

      expect(hour()).toBe(19);
    });

    it('reschedules for the new timezone when it changes', () => {
      startAt('2026-11-18T03:30:00Z', LA_PAZ);
      staffSettings.set(settingsFor(SAO_PAULO));
      TestBed.tick();
      const hour = computed(() => clock.hour());
      expect(hour()).toBe(0);
      expect(vi.getTimerCount()).toBe(1);

      vi.advanceTimersByTime(31 * 60_000);
      expect(hour()).toBe(0);

      vi.advanceTimersByTime(11 * 3_600_000);
      expect(hour()).toBe(12);
    });

    it('updates today when the document becomes visible after a clock jump', () => {
      startAt('2026-11-17T14:00:00Z', LA_PAZ);
      const today = computed(() => clock.today());
      expect(today()).toBe('2026-11-17');

      vi.setSystemTime(new Date('2026-11-19T14:00:00Z'));
      showDocument('visible');

      expect(today()).toBe('2026-11-19');
      expect(vi.getTimerCount()).toBe(1);
    });

    it('ignores visibility changes while the document is hidden', () => {
      startAt('2026-11-17T14:00:00Z', LA_PAZ);
      const today = computed(() => clock.today());
      expect(today()).toBe('2026-11-17');

      vi.setSystemTime(new Date('2026-11-19T14:00:00Z'));
      showDocument('hidden');

      expect(today()).toBe('2026-11-17');
    });

    it('clears the timer when destroyed', () => {
      startAt('2026-11-17T14:00:00Z', LA_PAZ);
      expect(vi.getTimerCount()).toBe(1);

      TestBed.resetTestingModule();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('stops reacting to visibility changes when destroyed', () => {
      startAt('2026-11-17T14:00:00Z', LA_PAZ);
      TestBed.resetTestingModule();

      showDocument('visible');

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
