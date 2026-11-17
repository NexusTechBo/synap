import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { WritableSignal, provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { ClinicCountryService } from '../../../../core/clinic/clinic-country.service';
import { CountryCode, Specialty, Staff } from '../../../../core/models/api.models';
import { StaffService } from '../../staff.service';
import { StaffFormData, StaffFormDialogComponent } from './staff-form-dialog.component';

const CI_MESSAGE = 'Solo números, de 5 a 10 dígitos';

function staff(overrides: Partial<Staff> = {}): Staff {
  return {
    id: 3,
    username: 'luis.perez@clinicacentral.com',
    document: '1234567-LP',
    name: 'Luis Pérez',
    email: 'luis@email.com',
    phoneNumber: null,
    active: true,
    alsoDoctor: false,
    role: 'ASSISTANT',
    specialtyId: null,
    specialtyName: null,
    ...overrides,
  };
}

describe('StaffFormDialogComponent', () => {
  let fixture: ComponentFixture<StaffFormDialogComponent>;
  let element: HTMLElement;
  let staffService: {
    specialties: WritableSignal<Specialty[]>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dialogRef: { id: string; close: ReturnType<typeof vi.fn> };

  async function setup(data: StaffFormData = {}): Promise<void> {
    staffService = {
      specialties: signal<Specialty[]>([{ id: 1, name: 'Cardiología' }]),
      create: vi.fn(() => of(staff())),
      update: vi.fn(() => of(staff())),
    };
    dialogRef = { id: 'staff-dialog', close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [StaffFormDialogComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal('BO'), phonePlaceholder: signal('') },
        },
        { provide: StaffService, useValue: staffService },
        {
          provide: AuthService,
          useValue: { clinic: signal({ name: 'Clínica Central', slug: 'clinicacentral' }) },
        },
        { provide: DialogRef, useValue: dialogRef },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(StaffFormDialogComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function field(label: string): HTMLInputElement | null {
    const labelElement = [...element.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === label,
    );
    return labelElement
      ? element.querySelector<HTMLInputElement>(`[id="${labelElement.htmlFor}"]`)
      : null;
  }

  async function type(label: string, value: string): Promise<void> {
    const input = field(label)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function chooseRole(label: string): Promise<void> {
    [...element.querySelectorAll('label')]
      .find((l) => l.textContent?.trim() === label)!
      .querySelector<HTMLInputElement>('input[type="radio"]')!
      .click();
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  function ciError(): string | undefined {
    return element.querySelector('#staff-document-error')?.textContent?.trim();
  }

  describe('create mode', () => {
    beforeEach(async () => {
      await setup();
      await chooseRole('Asistente');
      await type('Nombre completo', 'Luis Pérez');
      await type('Email', 'luis@email.com');
      await type('Usuario', 'luis.perez');
      await type('Contraseña inicial', 'secreto123');
    });

    it('renders the CI field limited to 10 characters', () => {
      expect(field('CI (opcional)')?.getAttribute('maxlength')).toBe('10');
    });

    it.each(['1234', '12a45', '12 345', '12345678901'])(
      'shows the CI rule and blocks submit for "%s" (DEF-02)',
      async (document) => {
        await type('CI (opcional)', document);

        expect(ciError()).toBe(CI_MESSAGE);
        await submit();
        expect(staffService.create).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
      },
    );

    it('is valid with an empty CI and sends null', async () => {
      await submit();

      expect(ciError()).toBeUndefined();
      expect(staffService.create).toHaveBeenCalledWith(expect.objectContaining({ document: null }));
    });

    it('treats a whitespace-only CI as invalid and does not send it', async () => {
      await type('CI (opcional)', '   ');

      expect(ciError()).toBe(CI_MESSAGE);
      await submit();
      expect(staffService.create).not.toHaveBeenCalled();
    });

    it('creates the member with a valid CI and closes', async () => {
      await type('CI (opcional)', '1234567890');

      await submit();

      expect(ciError()).toBeUndefined();
      expect(staffService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          document: '1234567890',
          role: 'ASSISTANT',
          username: 'luis.perez',
        }),
      );
      expect(dialogRef.close).toHaveBeenCalledOnce();
    });
  });

  describe('specialty requirement for doctors', () => {
    beforeEach(async () => {
      await setup();
      await type('Nombre completo', 'Luis Pérez');
      await type('Email', 'luis@email.com');
      await type('Usuario', 'luis.perez');
      await type('Contraseña inicial', 'secreto123');
    });

    it('blocks submit for a doctor without specialty', async () => {
      await submit();

      expect(staffService.create).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('allows submit without specialty once the role is not doctor', async () => {
      await chooseRole('Asistente');
      await submit();

      expect(staffService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ASSISTANT' }),
      );
    });

    it('blocks again when switching back to doctor', async () => {
      await chooseRole('Asistente');
      await chooseRole('Doctor');
      await submit();

      expect(staffService.create).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    it('does not render nor validate the CI and saves without it', async () => {
      await setup({ staff: staff({ document: '1234567-LP' }) });

      expect(field('CI (opcional)')).toBeNull();
      expect(element.querySelector('#staff-document')).toBeNull();
      await submit();

      expect(ciError()).toBeUndefined();
      expect(staffService.update).toHaveBeenCalledWith(3, {
        name: 'Luis Pérez',
        email: 'luis@email.com',
        phoneNumber: null,
        role: 'ASSISTANT',
        specialtyId: null,
        password: null,
      });
      expect(staffService.update.mock.calls[0][1]).not.toHaveProperty('document');
      expect(dialogRef.close).toHaveBeenCalledOnce();
    });
  });
});

describe('StaffFormDialogComponent document by country', () => {
  let fixture: ComponentFixture<StaffFormDialogComponent>;
  let element: HTMLElement;
  let create: ReturnType<typeof vi.fn>;

  async function setup(country: CountryCode): Promise<void> {
    create = vi.fn(() => of(staff()));
    TestBed.configureTestingModule({
      imports: [StaffFormDialogComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal(country), phonePlaceholder: signal('+55 11 91234-5678') },
        },
        {
          provide: StaffService,
          useValue: { specialties: signal<Specialty[]>([]), create, update: vi.fn() },
        },
        {
          provide: AuthService,
          useValue: { clinic: signal({ name: 'Clínica Central', slug: 'clinicacentral' }) },
        },
        { provide: DialogRef, useValue: { id: 'staff-dialog', close: vi.fn() } },
        { provide: DIALOG_DATA, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(StaffFormDialogComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function field(label: string): HTMLInputElement | null {
    const labelElement = [...element.querySelectorAll('label')].find(
      (l) => l.textContent?.trim() === label,
    );
    return labelElement
      ? element.querySelector<HTMLInputElement>(`[id="${labelElement.htmlFor}"]`)
      : null;
  }

  async function type(label: string, value: string): Promise<void> {
    const input = field(label)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function fillRequired(): Promise<void> {
    [...element.querySelectorAll('label')]
      .find((l) => l.textContent?.trim() === 'Asistente')!
      .querySelector<HTMLInputElement>('input[type="radio"]')!
      .click();
    await fixture.whenStable();
    await type('Nombre completo', 'Luis Pérez');
    await type('Email', 'luis@email.com');
    await type('Usuario', 'luis.perez');
    await type('Contraseña inicial', 'secreto123');
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it('shows the CPF label, placeholders and a 14 character limit in a BR clinic', async () => {
    await setup('BR');

    expect(field('CPF (opcional)')?.placeholder).toBe('000.000.000-00');
    expect(field('CPF (opcional)')?.getAttribute('maxlength')).toBe('14');
    expect(field('Teléfono (opcional)')?.placeholder).toBe('+55 11 91234-5678');
    expect(field('CI (opcional)')).toBeNull();
  });

  it('shows the CI label and placeholder in a BO clinic', async () => {
    await setup('BO');

    expect(field('CI (opcional)')?.placeholder).toBe('12345678');
  });

  it('sends a valid CPF as document', async () => {
    await setup('BR');
    await fillRequired();
    await type('CPF (opcional)', '529.982.247-25');

    await submit();

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ document: '529.982.247-25' }));
  });

  it('blocks submit and shows the CPF message for an invalid CPF', async () => {
    await setup('BR');
    await fillRequired();
    await type('CPF (opcional)', '52998224724');

    await submit();

    expect(element.querySelector('#staff-document-error')?.textContent?.trim()).toBe(
      'CPF inválido: 11 dígitos con dígito verificador válido',
    );
    expect(create).not.toHaveBeenCalled();
  });
});
