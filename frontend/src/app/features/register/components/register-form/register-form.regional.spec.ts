import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegionsStore } from '../../../../core/clinic/regions.store';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { RegionCountry } from '../../../../core/models/api.models';
import { RegisterService } from '../../register.service';
import { RegisterFormComponent } from './register-form.component';

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

describe('RegisterFormComponent regional settings', () => {
  let fixture: ComponentFixture<RegisterFormComponent>;
  let element: HTMLElement;
  let register: { register: ReturnType<typeof vi.fn> };

  async function setup(catalogAvailable: boolean): Promise<void> {
    register = { register: vi.fn() };
    TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([]),
        {
          provide: RegionsStore,
          useValue: {
            available: signal(catalogAvailable),
            countries: signal(catalogAvailable ? COUNTRIES : []),
            languages: signal(catalogAvailable ? ['es', 'en', 'pt-BR'] : []),
            country: (code: string) =>
              catalogAvailable ? COUNTRIES.find((c) => c.code === code) : undefined,
          },
        },
        {
          provide: RegisterService,
          useValue: {
            ...register,
            submitting: signal(false),
            coolingDown: signal(false),
            retryInLabel: signal(''),
            cooldownFinished: signal(false),
          },
        },
      ],
    });
    localStorage.setItem('lang', 'es');
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(RegisterFormComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => fixture.destroy());

  function field(label: string): HTMLInputElement {
    const labelElement = [...element.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === label,
    );
    return element.querySelector<HTMLInputElement>(`[id="${labelElement!.htmlFor}"]`)!;
  }

  async function type(label: string, value: string): Promise<void> {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fillValid(): Promise<void> {
    await type('Nombre del espacio de trabajo', 'Mi consultorio');
    await type('Teléfono', '70000000');
    await type('Identificador del espacio de trabajo', 'miconsultorio');
    await type('Nombre completo', 'Ana Rojas');
    await type('Usuario', 'admin');
    await type('Correo electrónico', 'admin@email.com');
    await type('Contraseña', 'secreto123');
  }

  async function submit(): Promise<void> {
    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.trim() === 'Crear mi espacio de trabajo')!
      .click();
    await fixture.whenStable();
  }

  async function pickCountry(label: string): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[id="register-country"]')!.click();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((el) => el.textContent?.trim() === label)!
      .click();
    await fixture.whenStable();
  }

  describe('with the regional catalog available', () => {
    beforeEach(() => setup(true));

    it('renders the regional selects', () => {
      expect(element.querySelector('app-regional-fields')).not.toBeNull();
      expect(element.querySelector('button[id="register-country"]')).not.toBeNull();
    });

    it('sends country, timezone and default language, defaulting to Bolivia', async () => {
      await fillValid();

      await submit();

      expect(register.register).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'BO',
          timezone: 'America/La_Paz',
          defaultLanguage: 'es',
        }),
      );
    });

    it('does not leak the nested regional group into the request', async () => {
      await fillValid();

      await submit();

      expect(register.register.mock.calls[0][0]).not.toHaveProperty('regional');
    });

    it('sends the defaults of the country picked by the user', async () => {
      await fillValid();
      await pickCountry('Brasil');

      await submit();

      expect(register.register).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'BR',
          timezone: 'America/Sao_Paulo',
          defaultLanguage: 'pt-BR',
        }),
      );
    });

    it('shows the phone placeholder of the selected country', async () => {
      expect(field('Teléfono').placeholder).toBe('+591 70000000');

      await pickCountry('Brasil');

      expect(field('Teléfono').placeholder).toBe('+55 11 91234-5678');
    });
  });

  describe('when the catalog failed to load', () => {
    beforeEach(() => setup(false));

    it('does not render the regional selects', () => {
      expect(element.querySelector('app-regional-fields')).toBeNull();
    });

    it('falls back to the generic phone placeholder', () => {
      expect(field('Teléfono').placeholder).toBe('Incluye el código de país');
    });

    it('registers without country, timezone nor defaultLanguage', async () => {
      await fillValid();

      await submit();

      expect(register.register).toHaveBeenCalledOnce();
      const request = register.register.mock.calls[0][0];
      expect(request).not.toHaveProperty('country');
      expect(request).not.toHaveProperty('timezone');
      expect(request).not.toHaveProperty('defaultLanguage');
      expect(request).not.toHaveProperty('regional');
    });
  });
});
