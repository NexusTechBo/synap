import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { WritableSignal, provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../../../../app/core/auth/auth.service';
import { ClinicCountryService } from '../../../../../../app/core/clinic/clinic-country.service';
import { CountryCode, Specialty, Staff } from '../../../../../../app/core/models/api.models';
import {
  StaffFormData,
  StaffFormDialogComponent,
} from '../../../../../../app/features/staff/components/staff-form-dialog/staff-form-dialog.component';
import { StaffService } from '../../../../../../app/features/staff/staff.service';
import {
  CI_MESSAGE,
  CPF_MESSAGE,
  FormDom,
  expectTooltipLegendNamesFieldset,
  formDom,
} from '../../../../../testing/form-dom';

interface SetupOptions {
  data?: StaffFormData;
  country?: CountryCode;
  phonePlaceholder?: string;
}

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
  let dom: FormDom;
  let staffService: {
    specialties: WritableSignal<Specialty[]>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dialogRef: { id: string; close: ReturnType<typeof vi.fn> };

  async function setup({
    data = {},
    country = 'BO',
    phonePlaceholder = '',
  }: SetupOptions = {}): Promise<void> {
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
          useValue: { country: signal(country), phonePlaceholder: signal(phonePlaceholder) },
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
    dom = formDom(fixture);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function fillIdentity(): Promise<void> {
    await dom.type('Nombre completo', 'Luis Pérez');
    await dom.type('Email', 'luis@email.com');
    await dom.type('Usuario', 'luis.perez');
    await dom.type('Contraseña inicial', 'secreto123');
  }

  async function fillRequired(): Promise<void> {
    await dom.chooseRadio('Asistente');
    await fillIdentity();
  }

  function ciError(): string | undefined {
    return element.querySelector('#staff-document-error')?.textContent?.trim();
  }

  it('keeps the legend as the first child of the role fieldset and names the group after it', async () => {
    await setup();

    expectTooltipLegendNamesFieldset(element, 'Rol');
  });

  describe('create mode', () => {
    beforeEach(async () => {
      await setup();
      await fillRequired();
    });

    it('renders the CI field limited to 10 characters', () => {
      expect(dom.field('CI (opcional)').getAttribute('maxlength')).toBe('10');
    });

    it.each(['1234', '12a45', '12 345', '12345678901', '   '])(
      'shows the CI rule and blocks submit for "%s" (DEF-02)',
      async (document) => {
        await dom.type('CI (opcional)', document);

        expect(ciError()).toBe(CI_MESSAGE);
        await dom.submit();
        expect(staffService.create).not.toHaveBeenCalled();
        expect(dialogRef.close).not.toHaveBeenCalled();
      },
    );

    it('is valid with an empty CI and sends null', async () => {
      await dom.submit();

      expect(ciError()).toBeUndefined();
      expect(staffService.create).toHaveBeenCalledWith(expect.objectContaining({ document: null }));
    });

    it('creates the member with a valid CI and closes', async () => {
      await dom.type('CI (opcional)', '1234567890');

      await dom.submit();

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
      await fillIdentity();
    });

    it('blocks submit for a doctor without specialty', async () => {
      await dom.submit();

      expect(staffService.create).not.toHaveBeenCalled();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('allows submit without specialty once the role is not doctor', async () => {
      await dom.chooseRadio('Asistente');
      await dom.submit();

      expect(staffService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ASSISTANT' }),
      );
    });

    it('blocks again when switching back to doctor', async () => {
      await dom.chooseRadio('Asistente');
      await dom.chooseRadio('Doctor');
      await dom.submit();

      expect(staffService.create).not.toHaveBeenCalled();
    });
  });

  describe('initial role', () => {
    function checkedRoles(): string[] {
      return [...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
        .filter((radio) => radio.checked)
        .map((radio) => radio.closest('label')?.textContent?.trim() ?? '');
    }

    it('defaults to doctor when creating', async () => {
      await setup();

      expect(checkedRoles()).toEqual(['Doctor']);
    });

    it.each([
      ['DOCTOR', 'Doctor'],
      ['ASSISTANT', 'Asistente'],
    ] as const)('uses the role of the edited %s member', async (role, label) => {
      await setup({ data: { staff: staff({ role }) } });

      expect(checkedRoles()).toEqual([label]);
    });
  });

  describe('edit mode', () => {
    it('does not render nor validate the CI and saves without it', async () => {
      await setup({ data: { staff: staff({ document: '1234567-LP' }) } });

      expect(dom.findField('CI (opcional)')).toBeNull();
      expect(element.querySelector('#staff-document')).toBeNull();
      await dom.submit();

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

    it('marks the name field as the initial focus target', async () => {
      await setup({ data: { staff: staff() } });

      expect(element.querySelector('#staff-name')?.hasAttribute('cdkfocusinitial')).toBe(true);
    });

    it('keeps the phone optional when editing a non administrator', async () => {
      await setup({ data: { staff: staff() } });

      expect(dom.findField('Teléfono (opcional)')).not.toBeNull();
      await dom.submit();

      expect(staffService.update).toHaveBeenCalledOnce();
    });
  });

  describe('document by country', () => {
    it('shows the CPF label, placeholders and a 14 character limit in a BR clinic', async () => {
      await setup({ country: 'BR', phonePlaceholder: '+55 11 91234-5678' });

      expect(dom.field('CPF (opcional)').placeholder).toBe('000.000.000-00');
      expect(dom.field('CPF (opcional)').getAttribute('maxlength')).toBe('14');
      expect(dom.field('Teléfono (opcional)').placeholder).toBe('+55 11 91234-5678');
      expect(dom.findField('CI (opcional)')).toBeNull();
    });

    it('shows the CI label and placeholder in a BO clinic', async () => {
      await setup({ country: 'BO' });

      expect(dom.field('CI (opcional)').placeholder).toBe('12345678');
    });

    it('sends a valid CPF as document', async () => {
      await setup({ country: 'BR' });
      await fillRequired();
      await dom.type('CPF (opcional)', '529.982.247-25');

      await dom.submit();

      expect(staffService.create).toHaveBeenCalledWith(
        expect.objectContaining({ document: '529.982.247-25' }),
      );
    });

    it('blocks submit and shows the CPF message for an invalid CPF', async () => {
      await setup({ country: 'BR' });
      await fillRequired();
      await dom.type('CPF (opcional)', '52998224724');

      await dom.submit();

      expect(ciError()).toBe(CPF_MESSAGE);
      expect(staffService.create).not.toHaveBeenCalled();
    });
  });
});
