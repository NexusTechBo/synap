import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegionsStore } from '../../../../core/clinic/regions.store';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { RegisterService } from '../../register.service';
import { RegisterFormComponent } from './register-form.component';

const CI_MESSAGE = 'Solo números, de 5 a 10 dígitos';

describe('RegisterFormComponent', () => {
  let fixture: ComponentFixture<RegisterFormComponent>;
  let element: HTMLElement;
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
          useValue: { available: signal(false), countries: signal([]), country: () => undefined },
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
  });

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

  async function fillValid(document: string): Promise<void> {
    await type('Nombre del espacio de trabajo', 'Mi consultorio');
    await type('Teléfono', '70000000');
    await type('Identificador del espacio de trabajo', 'miconsultorio');
    await type('Nombre completo', 'Ana Rojas');
    await type('CI (opcional)', document);
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

  function ciError(): string | undefined {
    return element.querySelector('#register-admin-document-error')?.textContent?.trim();
  }

  describe('admin CI validation (DEF-02)', () => {
    it('limits the CI input to 10 characters', () => {
      expect(field('CI (opcional)').getAttribute('maxlength')).toBe('10');
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
