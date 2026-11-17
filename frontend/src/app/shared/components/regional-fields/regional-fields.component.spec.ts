import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegionsStore } from '../../../core/clinic/regions.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RegionCountry } from '../../../core/models/api.models';
import {
  RegionalFieldsComponent,
  RegionalForm,
  createRegionalForm,
} from './regional-fields.component';

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
    timezones: ['America/Sao_Paulo', 'America/Manaus'],
    defaultLanguage: 'pt-BR',
    phonePlaceholder: '+55 11 91234-5678',
  },
];

describe('RegionalFieldsComponent', () => {
  let fixture: ComponentFixture<RegionalFieldsComponent>;
  let element: HTMLElement;
  let form: RegionalForm;

  async function setup(initial: Parameters<typeof createRegionalForm>[0]): Promise<void> {
    TestBed.configureTestingModule({
      imports: [RegionalFieldsComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: RegionsStore,
          useValue: {
            countries: signal(COUNTRIES),
            languages: signal(['es', 'en', 'pt-BR']),
            country: (code: string) => COUNTRIES.find((c) => c.code === code),
          },
        },
      ],
    });
    localStorage.setItem('lang', 'es');
    await TestBed.inject(I18nService).init();
    form = createRegionalForm(initial);
    fixture = TestBed.createComponent(RegionalFieldsComponent);
    fixture.componentRef.setInput('form', form);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => fixture.destroy());

  function trigger(id: string): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>(`button[id="regional-${id}"]`)!;
  }

  async function pick(id: string, label: string): Promise<void> {
    trigger(id).click();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((el) => el.textContent?.trim() === label)!
      .click();
    await fixture.whenStable();
  }

  it('disables the time zone select when the country has a single zone', async () => {
    await setup({ country: 'BO' });

    expect(trigger('timezone').disabled).toBe(true);
    expect(form.controls.timezone.value).toBe('America/La_Paz');
    expect(form.controls.defaultLanguage.value).toBe('es');
  });

  it('enables the time zone select for a country with several zones', async () => {
    await setup({ country: 'BR', timezone: 'America/Manaus', defaultLanguage: 'en' });

    expect(trigger('timezone').disabled).toBe(false);
  });

  it('does not reset valid initial values on mount', async () => {
    await setup({ country: 'BR', timezone: 'America/Manaus', defaultLanguage: 'en' });

    expect(form.getRawValue()).toEqual({
      country: 'BR',
      timezone: 'America/Manaus',
      defaultLanguage: 'en',
    });
  });

  it('resets time zone and language to the country defaults when the user changes country', async () => {
    await setup({ country: 'BO' });

    await pick('country', 'Brasil');

    expect(form.getRawValue()).toEqual({
      country: 'BR',
      timezone: 'America/Sao_Paulo',
      defaultLanguage: 'pt-BR',
    });
    expect(trigger('timezone').disabled).toBe(false);
  });

  it('keeps the chosen language when only the zone changes within a country', async () => {
    await setup({ country: 'BR', timezone: 'America/Sao_Paulo', defaultLanguage: 'en' });

    await pick('timezone', 'America/Manaus');

    expect(form.getRawValue()).toEqual({
      country: 'BR',
      timezone: 'America/Manaus',
      defaultLanguage: 'en',
    });
  });

  it('corrects a time zone that does not belong to the country', async () => {
    await setup({ country: 'BR', timezone: 'America/La_Paz', defaultLanguage: 'es' });

    expect(form.controls.timezone.value).toBe('America/Sao_Paulo');
    expect(form.controls.defaultLanguage.value).toBe('es');
  });

  it('fills the defaults when only the country is given', async () => {
    await setup({ country: 'BR' });

    expect(form.controls.timezone.value).toBe('America/Sao_Paulo');
    expect(form.controls.defaultLanguage.value).toBe('pt-BR');
  });
});
