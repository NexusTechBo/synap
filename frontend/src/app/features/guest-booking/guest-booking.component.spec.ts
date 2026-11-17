import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { GuestSessionService } from '../../core/auth/guest-session.service';
import { ClinicCountryService } from '../../core/clinic/clinic-country.service';
import { CountryCode, GuestBookingPatient } from '../../core/models/api.models';
import { GuestBookingComponent, formatPhone } from './guest-booking.component';
import { GuestBookingService } from './guest-booking.service';

describe('formatPhone', () => {
  it.each([
    ['21 99876-5432', 'BR', '+55 21 99876-5432'],
    ['21998765432', 'BR', '+55 21 99876-5432'],
    ['(21) 3456-7890', 'BR', '+55 21 3456-7890'],
    ['70000020', 'BO', '+591 70000020'],
    ['7000 0020', 'BO', '+591 70000020'],
  ] as const)('formats the national number "%s" for %s', (raw, country, expected) => {
    expect(formatPhone(raw, country)).toBe(expected);
  });

  it.each([
    ['+55 (11) 91234-5678', 'BR', '+55 11 91234-5678'],
    ['5511912345678', 'BR', '+55 11 91234-5678'],
    ['+591 70000020', 'BO', '+591 70000020'],
    ['59170000020', 'BO', '+591 70000020'],
  ] as const)('does not add the country code again to "%s"', (raw, country, expected) => {
    expect(formatPhone(raw, country)).toBe(expected);
  });

  it('treats a leading 55 as the area code when it is not followed by a valid number', () => {
    expect(formatPhone('55 99876-5432', 'BR')).toBe('+55 55 99876-5432');
  });

  it.each([
    ['+591 70000020', 'BR'],
    ['+1 415 555 2671', 'BO'],
  ] as const)('returns "%s" as typed with a foreign prefix for %s', (raw, country) => {
    expect(formatPhone(raw, country)).toBe(raw);
  });

  it.each([
    ['  1234567  ', 'BR', '1234567'],
    ['2199876543210', 'BR', '2199876543210'],
    ['700000', 'BO', '700000'],
    ['700000201', 'BO', '700000201'],
  ] as const)(
    'returns "%s" trimmed when its length does not match for %s',
    (raw, country, expected) => {
      expect(formatPhone(raw, country)).toBe(expected);
    },
  );
});

describe('formatPhone with unusual input', () => {
  it.each([
    ['021 99876-5432', 'BR', '021 99876-5432'],
    ['0 21 99876-5432', 'BR', '0 21 99876-5432'],
    ['', 'BR', ''],
    ['   ', 'BO', ''],
    ['+', 'BR', '+'],
  ] as const)('returns "%s" as typed for %s', (raw, country, expected) => {
    expect(formatPhone(raw, country)).toBe(expected);
  });
});

describe('GuestBookingComponent summary', () => {
  let fixture: ComponentFixture<GuestBookingComponent>;
  let element: HTMLElement;

  function setup(country: CountryCode, patient: GuestBookingPatient): void {
    const booking = {
      step: signal('summary'),
      stepNumber: signal(4),
      totalSteps: 4,
      error: signal(null),
      clinicName: signal('Clínica Sol'),
      clinicErrorMessage: signal(null),
      submitting: signal(false),
      coolingDown: signal(false),
      retryInLabel: signal(''),
      cooldownFinished: signal(false),
      selectedDoctor: signal({
        id: 1,
        name: 'Dr. Gómez',
        specialtyId: 1,
        specialtyName: 'Cardiología',
      }),
      selectedSlot: signal(null),
      selectedDate: signal('2026-11-20'),
      patient: signal(patient),
    };
    TestBed.configureTestingModule({
      imports: [GuestBookingComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => 'sol' } } },
        },
        {
          provide: GuestSessionService,
          useValue: { ready: signal(true), start: vi.fn(), releaseClinicContext: vi.fn() },
        },
        { provide: ClinicCountryService, useValue: { country: signal(country) } },
      ],
    });
    TestBed.overrideComponent(GuestBookingComponent, {
      set: { providers: [{ provide: GuestBookingService, useValue: booking }] },
    });
    fixture = TestBed.createComponent(GuestBookingComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  }

  function patientSummary(): string {
    const lines = [...element.querySelectorAll('dd')].map((dd) => dd.textContent?.trim() ?? '');
    return lines.find((line) => line.includes('·') || line.includes('+')) ?? '';
  }

  it('shows the phone in international format for a BR clinic', () => {
    setup('BR', { phoneNumber: '21 99876-5432', name: 'Ana', document: '52998224725' });

    expect(patientSummary()).toBe('CPF 529.982.247-25 · +55 21 99876-5432');
  });

  it('shows the phone in international format for a BO clinic', () => {
    setup('BO', { phoneNumber: '70000020' });

    expect(patientSummary()).toBe('+591 70000020');
  });
});
