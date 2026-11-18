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
});
