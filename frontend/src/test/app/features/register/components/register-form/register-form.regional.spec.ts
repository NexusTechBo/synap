import { WritableSignal, provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegionsStore } from '../../../../../../app/core/clinic/regions.store';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { ClinicLanguage, RegionCountry } from '../../../../../../app/core/models/api.models';
import { RegisterFormComponent } from '../../../../../../app/features/register/components/register-form/register-form.component';
import { RegisterService } from '../../../../../../app/features/register/register.service';
import { FormDom, formDom } from '../../../../../testing/form-dom';

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

const LANGUAGES: ClinicLanguage[] = ['es', 'en', 'pt-BR'];

describe('RegisterFormComponent regional settings', () => {
  let fixture: ComponentFixture<RegisterFormComponent>;
  let element: HTMLElement;
  let dom: FormDom;
  let register: { register: ReturnType<typeof vi.fn> };
  let reload: ReturnType<typeof vi.fn>;
  let store: {
    available: WritableSignal<boolean>;
    retrying: WritableSignal<boolean>;
    countries: WritableSignal<RegionCountry[]>;
    languages: WritableSignal<ClinicLanguage[]>;
  };

  async function setup(catalog: 'available' | 'loading' | 'retrying' | 'error'): Promise<void> {
    const catalogAvailable = catalog === 'available';
    register = { register: vi.fn() };
    reload = vi.fn();
    store = {
      available: signal(catalogAvailable),
      retrying: signal(catalog === 'retrying'),
      countries: signal(catalogAvailable ? COUNTRIES : []),
      languages: signal<ClinicLanguage[]>(catalogAvailable ? LANGUAGES : []),
    };
    TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([]),
        {
          provide: RegionsStore,
          useValue: {
            available: store.available,
            hasError: signal(catalog === 'error'),
            retrying: store.retrying,
            reload,
            countries: store.countries,
            languages: store.languages,
            country: (code: string) => store.countries().find((c) => c.code === code),
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
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(RegisterFormComponent);
    dom = formDom(fixture);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => fixture.destroy());

  async function fillValid(): Promise<void> {
    await dom.type('Nombre del espacio de trabajo', 'Mi consultorio');
    await dom.type('Teléfono', '70000000');
    await dom.type('Identificador del espacio de trabajo', 'miconsultorio');
    await dom.type('Nombre completo', 'Ana Rojas');
    await dom.type('Usuario', 'admin');
    await dom.type('Correo electrónico', 'admin@email.com');
    await dom.type('Contraseña', 'secreto123');
  }

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  function submit(): Promise<void> {
    return dom.clickButton('Crear mi espacio de trabajo');
  }

  async function pickCountry(label: string): Promise<void> {
    const select = element.querySelector<HTMLButtonElement>('button[id="register-country"]');
    if (!select) throw new Error('Country select not found');
    select.click();
    await fixture.whenStable();
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (el) => el.textContent?.trim() === label,
    );
    if (!option) throw new Error(`Option "${label}" not found`);
    option.click();
    await fixture.whenStable();
  }

  describe('with the regional catalog available', () => {
    beforeEach(() => setup('available'));

    it('does not mark the submit button as aria-disabled', () => {
      expect(submitButton().hasAttribute('aria-disabled')).toBe(false);
    });

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

    it('sends the administrator CI in the default Bolivian country', async () => {
      await fillValid();
      await dom.type('CI (opcional)', '1234567');

      await submit();

      expect(register.register).toHaveBeenCalledWith(
        expect.objectContaining({ adminDocument: '1234567' }),
      );
    });

    it('switches the document label, placeholder and limit when the country changes to BR', async () => {
      expect(dom.field('CI (opcional)').placeholder).toBe('12345678');

      await pickCountry('Brasil');

      expect(dom.field('CPF (opcional)').placeholder).toBe('000.000.000-00');
      expect(dom.field('CPF (opcional)').getAttribute('maxlength')).toBe('14');
    });

    it('invalidates a CI that was valid once the country changes to BR', async () => {
      await fillValid();
      await dom.type('CI (opcional)', '1234567');
      await pickCountry('Brasil');

      await submit();

      expect(register.register).not.toHaveBeenCalled();
    });

    it('accepts a valid CPF once the country changes to BR', async () => {
      await fillValid();
      await pickCountry('Brasil');
      await dom.type('CPF (opcional)', '529.982.247-25');

      await submit();

      expect(register.register).toHaveBeenCalledWith(
        expect.objectContaining({ adminDocument: '529.982.247-25', country: 'BR' }),
      );
    });

    it('invalidates a CPF that was valid once the country returns to BO', async () => {
      await fillValid();
      await pickCountry('Brasil');
      await dom.type('CPF (opcional)', '529.982.247-25');
      await pickCountry('Bolivia');

      await submit();

      expect(register.register).not.toHaveBeenCalled();
    });

    it('shows the phone placeholder of the selected country', async () => {
      expect(dom.field('Teléfono').placeholder).toBe('+591 70000000');

      await pickCountry('Brasil');

      expect(dom.field('Teléfono').placeholder).toBe('+55 11 91234-5678');
    });
  });

  describe('while the catalog is loading', () => {
    beforeEach(() => setup('loading'));

    it('shows a discreet loading text without any unavailable notice', () => {
      expect(element.querySelector('app-regional-fields')).toBeNull();
      expect(element.querySelector('app-load-error')).toBeNull();
      expect(element.querySelector('[role="status"]')?.textContent?.trim()).toBe('Cargando...');
      expect(element.textContent).not.toContain('El servicio no está disponible');
    });

    it('keeps the same status live region when the retry notice replaces the loading text', async () => {
      const before = element.querySelector('[role="status"]');

      store.retrying.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(element.querySelector('[role="status"]')).toBe(before);
      expect(before?.textContent?.trim()).toBe(
        'El servicio no está disponible todavía. Reintentando…',
      );
    });

    it('marks the submit button as aria-disabled', () => {
      expect(submitButton().getAttribute('aria-disabled')).toBe('true');
    });

    it('enables the submit button and registers once the catalog loads', async () => {
      store.countries.set(COUNTRIES);
      store.languages.set(LANGUAGES);
      store.available.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      await fillValid();

      await submit();

      expect(submitButton().hasAttribute('aria-disabled')).toBe(false);
      expect(register.register).toHaveBeenCalledOnce();
    });

    it('does not register without a region', async () => {
      await fillValid();

      await submit();

      expect(register.register).not.toHaveBeenCalled();
    });
  });

  describe('while the catalog request is being retried', () => {
    beforeEach(() => setup('retrying'));

    it('shows an informative status notice with a spinner instead of the selects', () => {
      expect(element.querySelector('app-regional-fields')).toBeNull();
      expect(element.querySelector('app-load-error')).toBeNull();
      const status = element.querySelector('[role="status"]');
      expect(status?.textContent?.trim()).toBe(
        'El servicio no está disponible todavía. Reintentando…',
      );
      expect(status?.querySelector('.animate-spin')).not.toBeNull();
      expect(element.querySelector('[role="alert"]')).toBeNull();
    });

    it('marks the submit button as aria-disabled', () => {
      expect(submitButton().getAttribute('aria-disabled')).toBe('true');
    });

    it('does not register without a region', async () => {
      await fillValid();

      await submit();

      expect(register.register).not.toHaveBeenCalled();
    });
  });

  describe('when the catalog failed to load', () => {
    beforeEach(() => setup('error'));

    it('shows the error with a retry button instead of the regional selects', () => {
      expect(element.querySelector('app-regional-fields')).toBeNull();
      expect(element.querySelector('[role="status"]')).toBeNull();
      expect(element.querySelector('app-load-error')?.textContent).toContain(
        'No se pudo cargar el catálogo regional',
      );
    });

    it('marks the submit button as aria-disabled', () => {
      expect(submitButton().getAttribute('aria-disabled')).toBe('true');
    });

    it('reloads the catalog when retry is clicked', async () => {
      await dom.clickButton('Reintentar');

      expect(reload).toHaveBeenCalledOnce();
    });

    it('falls back to the generic phone placeholder', () => {
      expect(dom.field('Teléfono').placeholder).toBe('Incluye el código de país');
    });

    it('does not register without a region and keeps the retry visible', async () => {
      await fillValid();

      await submit();

      expect(register.register).not.toHaveBeenCalled();
      expect(element.querySelector('app-load-error')).not.toBeNull();
    });
  });
});
