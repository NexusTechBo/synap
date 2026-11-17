import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ClinicCountryService } from '../../../core/clinic/clinic-country.service';
import { CountryCode, Patient } from '../../../core/models/api.models';
import { PatientFormData, PatientFormDialogComponent } from './patient-form-dialog.component';
import { PatientFormService } from './patient-form.service';

const CI_MESSAGE = 'Solo números, de 5 a 10 dígitos';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 7,
    document: '1234567',
    name: 'Ana Rojas',
    email: null,
    phoneNumber: '70000000',
    active: true,
    ...overrides,
  };
}

describe('PatientFormDialogComponent', () => {
  let fixture: ComponentFixture<PatientFormDialogComponent>;
  let element: HTMLElement;
  let patients: { save: ReturnType<typeof vi.fn> };
  let dialogRef: { id: string; close: ReturnType<typeof vi.fn> };

  async function setup(data: PatientFormData = {}): Promise<void> {
    patients = { save: vi.fn((_: unknown, request: object) => of(patient(request))) };
    dialogRef = { id: 'patient-dialog', close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [PatientFormDialogComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal('BO'), phonePlaceholder: signal('') },
        },
        { provide: PatientFormService, useValue: patients },
        { provide: DialogRef, useValue: dialogRef },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(PatientFormDialogComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function field(label: string): HTMLInputElement {
    const labelElement = [...element.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === label,
    );
    return element.querySelector<HTMLInputElement>(`[id="${labelElement!.htmlFor}"]`)!;
  }

  function submitButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  }

  function ciError(): string | undefined {
    return element.querySelector('#patient-document-error')?.textContent?.trim();
  }

  async function type(label: string, value: string): Promise<void> {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fillValid(document = '1234567'): Promise<void> {
    await type('Nombre completo', '  Ana Rojas  ');
    await type('Teléfono', '70000000');
    await type('CI (opcional)', document);
  }

  async function submit(): Promise<void> {
    submitButton().click();
    await fixture.whenStable();
  }

  describe('create mode', () => {
    beforeEach(() => setup());

    it('renders the create title and an empty CI limited to 10 characters', () => {
      expect(element.querySelector('h2')?.textContent).toContain('Nuevo paciente');
      expect(field('CI (opcional)').value).toBe('');
      expect(field('CI (opcional)').getAttribute('maxlength')).toBe('10');
      expect(submitButton().textContent).toContain('Crear paciente');
    });

    it('creates the patient with trimmed values and closes with the saved patient', async () => {
      await fillValid('1234567');

      await submit();

      expect(patients.save).toHaveBeenCalledWith(undefined, {
        name: 'Ana Rojas',
        document: '1234567',
        phoneNumber: '70000000',
        email: null,
      });
      expect(dialogRef.close).toHaveBeenCalledWith(
        expect.objectContaining({ document: '1234567' }),
      );
    });

    it('asks for the required fields on an empty submit but not for the optional CI', async () => {
      await submit();

      expect(ciError()).toBeUndefined();
      expect(element.querySelector('#patient-name-error')).not.toBeNull();
      expect(patients.save).not.toHaveBeenCalled();
    });

    it('is valid with an empty CI and sends null', async () => {
      await fillValid('');

      await submit();

      expect(ciError()).toBeUndefined();
      expect(patients.save).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({ document: null }),
      );
    });

    it('treats a whitespace-only CI as invalid and does not send it', async () => {
      await fillValid('   ');

      expect(ciError()).toBe(CI_MESSAGE);
      await submit();
      expect(patients.save).not.toHaveBeenCalled();
    });

    describe('CI validation (DEF-02)', () => {
      it.each([
        ['1234', 'too short'],
        ['12a45', 'with letters'],
        ['12 345', 'with spaces'],
      ])('shows the CI rule and blocks submit for "%s" (%s)', async (document) => {
        await fillValid(document);

        expect(ciError()).toBe(CI_MESSAGE);
        expect(field('CI (opcional)').getAttribute('aria-invalid')).toBe('true');
        await submit();
        expect(patients.save).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
      });

      it('shows the CI rule, not the length message, for a pasted value over 10 digits', async () => {
        await fillValid('12345678901');

        expect(ciError()).toBe(CI_MESSAGE);
        await submit();
        expect(patients.save).not.toHaveBeenCalled();
      });

      it.each(['12345', '1234567890'])('accepts the boundary value "%s"', async (document) => {
        await fillValid(document);

        expect(ciError()).toBeUndefined();
        await submit();
        expect(patients.save).toHaveBeenCalledWith(
          undefined,
          expect.objectContaining({ document }),
        );
      });
    });

    it('disables the submit button and ignores double submit while saving', async () => {
      patients.save.mockReturnValue(new Subject<Patient>());
      await fillValid();

      await submit();
      expect(submitButton().disabled).toBe(true);
      expect(submitButton().textContent).toContain('Guardando…');

      element.querySelector('form')!.dispatchEvent(new Event('submit'));
      expect(patients.save).toHaveBeenCalledOnce();
    });

    it('shows the API error and stays open on failure', async () => {
      patients.save.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { status: 409, message: 'Ya existe un paciente con ese CI' },
            }),
        ),
      );
      await fillValid();

      await submit();

      expect(element.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
        'Ya existe un paciente con ese CI',
      );
      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(submitButton().disabled).toBe(false);
    });

    it('closes without saving from the cancel button', () => {
      [...element.querySelectorAll<HTMLButtonElement>('button')]
        .find((b) => b.textContent?.trim() === 'Cancelar')!
        .click();

      expect(dialogRef.close).toHaveBeenCalledWith();
      expect(patients.save).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('prefills the form and updates the patient', async () => {
      const existing = patient();
      await setup({ patient: existing });

      expect(element.querySelector('h2')?.textContent).toContain('Editar paciente');
      expect(field('CI (opcional)').value).toBe('1234567');
      await submit();

      expect(patients.save).toHaveBeenCalledWith(existing, {
        name: 'Ana Rojas',
        document: '1234567',
        phoneNumber: '70000000',
        email: null,
      });
    });

    it('edits a patient without CI and keeps it null', async () => {
      await setup({ patient: patient({ document: null }) });

      expect(field('CI (opcional)').value).toBe('');
      await submit();

      expect(patients.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ document: null }),
      );
    });

    it('allows saving an existing patient whose unchanged document no longer matches the rule', async () => {
      await setup({ patient: patient({ document: '1234567-LP' }) });

      await submit();

      expect(ciError()).toBeUndefined();
      expect(patients.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ document: '1234567-LP' }),
      );
    });

    it('blocks saving an existing patient whose edited document breaks the rule', async () => {
      await setup({ patient: patient({ document: '1234567-LP' }) });

      await type('CI (opcional)', '12');
      await submit();

      expect(ciError()).toBe(CI_MESSAGE);
      expect(patients.save).not.toHaveBeenCalled();
    });
  });
});

describe('PatientFormDialogComponent in a BR clinic', () => {
  const CPF_MESSAGE = 'CPF inválido: 11 dígitos con dígito verificador válido';
  let fixture: ComponentFixture<PatientFormDialogComponent>;
  let element: HTMLElement;
  let patients: { save: ReturnType<typeof vi.fn> };

  async function setup(data: PatientFormData = {}, country: CountryCode = 'BR'): Promise<void> {
    patients = { save: vi.fn((_: unknown, request: object) => of(patient(request))) };
    TestBed.configureTestingModule({
      imports: [PatientFormDialogComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal(country), phonePlaceholder: signal('+55 11 91234-5678') },
        },
        { provide: PatientFormService, useValue: patients },
        { provide: DialogRef, useValue: { id: 'patient-dialog', close: vi.fn() } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(PatientFormDialogComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

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

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  function documentError(): string | undefined {
    return element.querySelector('#patient-document-error')?.textContent?.trim();
  }

  async function fillValid(document: string): Promise<void> {
    await type('Nombre completo', 'Ana Rojas');
    await type('Teléfono', '11912345678');
    await type('CPF (opcional)', document);
  }

  it('shows the CPF label, placeholders and a 14 character limit', async () => {
    await setup();

    expect(field('CPF (opcional)').placeholder).toBe('000.000.000-00');
    expect(field('CPF (opcional)').getAttribute('maxlength')).toBe('14');
    expect(field('Teléfono').placeholder).toBe('+55 11 91234-5678');
  });

  it.each(['529.982.247-25', '52998224725'])(
    'accepts the valid CPF "%s" and sends it as document',
    async (document) => {
      await setup();
      await fillValid(document);

      await submit();

      expect(documentError()).toBeUndefined();
      expect(patients.save).toHaveBeenCalledWith(undefined, expect.objectContaining({ document }));
    },
  );

  it('shows the CPF message and blocks submit for a wrong check digit', async () => {
    await setup();
    await fillValid('52998224724');

    await submit();

    expect(documentError()).toBe(CPF_MESSAGE);
    expect(patients.save).not.toHaveBeenCalled();
  });

  it('rejects a CI-shaped value that is not a CPF', async () => {
    await setup();
    await fillValid('1234567');

    expect(documentError()).toBe(CPF_MESSAGE);
  });

  it('allows saving an existing patient whose unchanged document is not a valid CPF', async () => {
    await setup({ patient: patient({ document: '1234567' }) });

    await submit();

    expect(documentError()).toBeUndefined();
    expect(patients.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ document: '1234567' }),
    );
  });

  it('blocks saving an existing patient whose document was edited to an invalid CPF', async () => {
    await setup({ patient: patient({ document: '1234567' }) });

    await type('CPF (opcional)', '52998224724');
    await submit();

    expect(documentError()).toBe(CPF_MESSAGE);
    expect(patients.save).not.toHaveBeenCalled();
  });

  it('keeps the CI label and limit in a BO clinic', async () => {
    await setup({}, 'BO');

    expect(field('CI (opcional)').getAttribute('maxlength')).toBe('10');
  });
});
