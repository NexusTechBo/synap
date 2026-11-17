import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClinicCountryService } from '../../../../core/clinic/clinic-country.service';
import { CountryCode, GuestBookingPatient } from '../../../../core/models/api.models';
import { GuestPatientFormComponent } from './guest-patient-form.component';

const CI_MESSAGE = 'Solo números, de 5 a 10 dígitos';

describe('GuestPatientFormComponent', () => {
  let fixture: ComponentFixture<GuestPatientFormComponent>;
  let element: HTMLElement;
  let submitted: GuestBookingPatient[];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GuestPatientFormComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal('BO'), phonePlaceholder: signal('') },
        },
      ],
    });
    fixture = TestBed.createComponent(GuestPatientFormComponent);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((patient) => submitted.push(patient));
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

  async function chooseKind(label: string): Promise<void> {
    [...element.querySelectorAll('label')]
      .find((l) => l.textContent?.trim() === label)!
      .querySelector<HTMLInputElement>('input[type="radio"]')!
      .click();
    await fixture.whenStable();
  }

  async function type(label: string, value: string): Promise<void> {
    const input = field(label);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.trim() === 'Continuar')!
      .click();
    await fixture.whenStable();
  }

  function ciError(): string | undefined {
    return element.querySelector('#guest-document-error')?.textContent?.trim();
  }

  const RETURNING = 'Ya me atendí en este espacio de trabajo';
  const NEW = 'Es mi primera vez';

  function hasField(label: string): boolean {
    return [...element.querySelectorAll('label')].some((l) => l.textContent?.trim() === label);
  }

  describe('returning patient', () => {
    beforeEach(() => chooseKind(RETURNING));

    it('shows no CI field and explains that the phone is needed', () => {
      expect(hasField('CI (opcional)')).toBe(false);
      expect(element.textContent).toContain('Ingresa el teléfono con el que te registraste.');
    });

    it('emits only the phone number', async () => {
      await type('Teléfono', ' 70000000 ');

      await submit();

      expect(submitted).toEqual([{ phoneNumber: '70000000' }]);
    });

    it('does not emit without a phone', async () => {
      await submit();

      expect(submitted).toEqual([]);
    });
  });

  describe('new patient', () => {
    beforeEach(async () => {
      await chooseKind(NEW);
      await type('Nombre completo', ' Ana Rojas ');
      await type('Teléfono', '70000000');
    });

    it('limits the optional CI input to 10 characters', () => {
      expect(field('CI (opcional)').getAttribute('maxlength')).toBe('10');
    });

    it('is valid without CI and emits null', async () => {
      await submit();

      expect(ciError()).toBeUndefined();
      expect(submitted).toEqual([
        { document: null, phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });

    it.each(['1234', '12a45', '12 345', '12345678901', '   '])(
      'shows the CI rule and does not emit for "%s"',
      async (document) => {
        await type('CI (opcional)', document);

        expect(ciError()).toBe(CI_MESSAGE);
        await submit();
        expect(submitted).toEqual([]);
      },
    );

    it('emits the CI when valid', async () => {
      await type('CI (opcional)', '1234567890');
      await type('Email (opcional)', 'ana@mail.test');

      await submit();

      expect(ciError()).toBeUndefined();
      expect(submitted).toEqual([
        {
          document: '1234567890',
          phoneNumber: '70000000',
          name: 'Ana Rojas',
          email: 'ana@mail.test',
        },
      ]);
    });
  });

  describe('restoring with initial', () => {
    async function restore(initial: GuestBookingPatient): Promise<void> {
      fixture.componentRef.setInput('initial', initial);
      fixture.componentInstance.ngOnInit();
      await fixture.whenStable();
    }

    it('restores a returning patient (no name)', async () => {
      await restore({ phoneNumber: '70000000' });

      expect(hasField('CI (opcional)')).toBe(false);
      expect(field('Teléfono').value).toBe('70000000');
      await submit();
      expect(submitted).toEqual([{ phoneNumber: '70000000' }]);
    });

    it('restores a new patient with CI', async () => {
      await restore({ document: '12345', phoneNumber: '70000000', name: 'Ana Rojas', email: null });

      expect(field('CI (opcional)').value).toBe('12345');
      expect(field('Nombre completo').value).toBe('Ana Rojas');
      await submit();
      expect(submitted).toEqual([
        { document: '12345', phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });

    it('restores a new patient without CI', async () => {
      await restore({ document: null, phoneNumber: '70000000', name: 'Ana Rojas' });

      expect(field('CI (opcional)').value).toBe('');
      await submit();
      expect(submitted).toEqual([
        { document: null, phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });
  });
});

describe('GuestPatientFormComponent document by country', () => {
  let fixture: ComponentFixture<GuestPatientFormComponent>;
  let element: HTMLElement;
  let submitted: GuestBookingPatient[];

  async function setup(country: CountryCode): Promise<void> {
    TestBed.configureTestingModule({
      imports: [GuestPatientFormComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal(country), phonePlaceholder: signal('+55 11 91234-5678') },
        },
      ],
    });
    fixture = TestBed.createComponent(GuestPatientFormComponent);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((patient) => submitted.push(patient));
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
    [...element.querySelectorAll('label')]
      .find((l) => l.textContent?.trim() === 'Es mi primera vez')!
      .querySelector<HTMLInputElement>('input[type="radio"]')!
      .click();
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

  async function submit(): Promise<void> {
    [...element.querySelectorAll<HTMLButtonElement>('button')]
      .find((b) => b.textContent?.trim() === 'Continuar')!
      .click();
    await fixture.whenStable();
  }

  it('shows the CPF label, placeholders and a 14 character limit in a BR clinic', async () => {
    await setup('BR');

    expect(field('CPF (opcional)')?.placeholder).toBe('000.000.000-00');
    expect(field('CPF (opcional)')?.getAttribute('maxlength')).toBe('14');
    expect(field('Teléfono')?.placeholder).toBe('+55 11 91234-5678');
    expect(field('CI (opcional)')).toBeNull();
  });

  it('emits a valid CPF as document', async () => {
    await setup('BR');
    await type('Nombre completo', 'Ana Rojas');
    await type('Teléfono', '11912345678');
    await type('CPF (opcional)', '529.982.247-25');

    await submit();

    expect(submitted).toEqual([
      { document: '529.982.247-25', phoneNumber: '11912345678', name: 'Ana Rojas', email: null },
    ]);
  });

  it('blocks submit and shows the CPF message for an invalid CPF', async () => {
    await setup('BR');
    await type('Nombre completo', 'Ana Rojas');
    await type('Teléfono', '11912345678');
    await type('CPF (opcional)', '52998224724');

    await submit();

    expect(element.querySelector('#guest-document-error')?.textContent?.trim()).toBe(
      'CPF inválido: 11 dígitos con dígito verificador válido',
    );
    expect(submitted).toEqual([]);
  });
});
