import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegionsStore } from '../../../../../../app/core/clinic/regions.store';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { RegionCountry } from '../../../../../../app/core/models/api.models';
import { RegisterFormComponent } from '../../../../../../app/features/register/components/register-form/register-form.component';
import { RegisterService } from '../../../../../../app/features/register/register.service';
import { CI_MESSAGE, FormDom, formDom } from '../../../../../testing/form-dom';

const BOLIVIA: RegionCountry = {
  code: 'BO',
  defaultTimezone: 'America/La_Paz',
  timezones: ['America/La_Paz'],
  defaultLanguage: 'es',
  phonePlaceholder: '+591 70000000',
};

describe('RegisterFormComponent', () => {
  let fixture: ComponentFixture<RegisterFormComponent>;
  let element: HTMLElement;
  let dom: FormDom;
  let register: { register: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    register = { register: vi.fn() };
    TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        provideZoneChangeDetection(),
        provideRouter([]),
        {
          provide: RegionsStore,
          useValue: {
            available: signal(true),
            hasError: signal(false),
            countries: signal([BOLIVIA]),
            languages: signal(['es']),
            country: () => BOLIVIA,
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
  });

  async function fillValid(document: string): Promise<void> {
    await dom.type('Nombre del espacio de trabajo', 'Mi consultorio');
    await dom.type('Teléfono', '70000000');
    await dom.type('Identificador del espacio de trabajo', 'miconsultorio');
    await dom.type('Nombre completo', 'Ana Rojas');
    await dom.type('CI (opcional)', document);
    await dom.type('Usuario', 'admin');
    await dom.type('Correo electrónico', 'admin@email.com');
    await dom.type('Contraseña', 'secreto123');
  }

  function submit(): Promise<void> {
    return dom.clickButton('Crear mi espacio de trabajo');
  }

  function ciError(): string | undefined {
    return element.querySelector('#register-admin-document-error')?.textContent?.trim();
  }

  it('renders the back to home link', () => {
    const link = element.querySelector('app-back-to-home-link a');

    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.textContent?.trim()).toBe('Volver al inicio');
  });

  describe('admin CI validation (DEF-02)', () => {
    it('limits the CI input to 10 characters', () => {
      expect(dom.field('CI (opcional)').getAttribute('maxlength')).toBe('10');
    });

    it.each(['1234', '12a45', '12 345', '12345678901'])(
      'shows the CI rule and does not register for "%s"',
      async (document) => {
        await fillValid(document);

        expect(ciError()).toBe(CI_MESSAGE);
        await submit();
        expect(register.register).not.toHaveBeenCalled();
      },
    );

    it('is valid with an empty CI and sends it as an empty string', async () => {
      await fillValid('');

      await submit();

      expect(ciError()).toBeUndefined();
      expect(register.register).toHaveBeenCalledWith(
        expect.objectContaining({ adminDocument: '' }),
      );
    });

    it('registers the clinic with a valid CI', async () => {
      await fillValid('1234567890');

      await submit();

      expect(ciError()).toBeUndefined();
      expect(register.register).toHaveBeenCalledWith(
        expect.objectContaining({ adminDocument: '1234567890', slug: 'miconsultorio' }),
      );
    });
  });
});
