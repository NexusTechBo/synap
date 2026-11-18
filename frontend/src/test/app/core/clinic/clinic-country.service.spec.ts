import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GuestSessionService } from '../../../../app/core/auth/guest-session.service';
import { ClinicCountryService } from '../../../../app/core/clinic/clinic-country.service';
import { ClinicRegionalSettingsStore } from '../../../../app/core/clinic/clinic-regional-settings.store';
import { RegionsStore } from '../../../../app/core/clinic/regions.store';
import {
  ClinicRegionalSettings,
  CountryCode,
  RegionCountry,
} from '../../../../app/core/models/api.models';

const COUNTRIES: RegionCountry[] = [
  {
    code: 'BO',
    defaultTimezone: 'America/La_Paz',
    timezones: ['America/La_Paz'],
    defaultLanguage: 'es',
    phonePlaceholder: '+591 70000000',
  },
  {
    code: 'BR',
    defaultTimezone: 'America/Sao_Paulo',
    timezones: ['America/Sao_Paulo'],
    defaultLanguage: 'pt-BR',
    phonePlaceholder: '+55 11 91234-5678',
  },
];

function settingsFor(country: CountryCode): ClinicRegionalSettings {
  return { country, timezone: 'America/La_Paz', defaultLanguage: 'es' };
}

describe('ClinicCountryService', () => {
  let guestCountry: ReturnType<typeof signal<CountryCode | null>>;
  let staffSettings: ReturnType<typeof signal<ClinicRegionalSettings | null>>;
  let regionCountries: ReturnType<typeof signal<RegionCountry[]>>;
  let service: ClinicCountryService;

  beforeEach(() => {
    guestCountry = signal<CountryCode | null>(null);
    staffSettings = signal<ClinicRegionalSettings | null>(null);
    regionCountries = signal<RegionCountry[]>(COUNTRIES);
    TestBed.configureTestingModule({
      providers: [
        { provide: GuestSessionService, useValue: { country: guestCountry } },
        { provide: ClinicRegionalSettingsStore, useValue: { settings: staffSettings } },
        {
          provide: RegionsStore,
          useValue: {
            country: (code: string) => regionCountries().find((c) => c.code === code),
          },
        },
      ],
    });
    service = TestBed.inject(ClinicCountryService);
  });

  describe('country', () => {
    it('defaults to BO without guest session nor settings', () => {
      expect(service.country()).toBe('BO');
    });

    it('uses the clinic settings country', () => {
      staffSettings.set(settingsFor('BR'));

      expect(service.country()).toBe('BR');
    });

    it('prefers the guest session country over the settings', () => {
      staffSettings.set(settingsFor('BO'));
      guestCountry.set('BR');

      expect(service.country()).toBe('BR');
    });

    it('falls back to the settings when the guest country is released', () => {
      staffSettings.set(settingsFor('BR'));
      guestCountry.set('BO');
      guestCountry.set(null);

      expect(service.country()).toBe('BR');
    });
  });

  describe('phonePlaceholder', () => {
    it('is the BO placeholder by default', () => {
      expect(service.phonePlaceholder()).toBe('+591 70000000');
    });

    it('is the BR placeholder in a BR clinic', () => {
      staffSettings.set(settingsFor('BR'));

      expect(service.phonePlaceholder()).toBe('+55 11 91234-5678');
    });

    it('is empty while the catalog is not loaded', () => {
      regionCountries.set([]);

      expect(service.phonePlaceholder()).toBe('');
    });
  });
});
