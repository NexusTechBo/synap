import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuestBookingPatient } from '../../../../core/models/api.models';
import { GuestPatientFormComponent } from './guest-patient-form.component';

const CI_MESSAGE = 'Solo números, de 5 a 10 dígitos';

describe('GuestPatientFormComponent', () => {
  let fixture: ComponentFixture<GuestPatientFormComponent>;
  let element: HTMLElement;
  let submitted: GuestBookingPatient[];

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GuestPatientFormComponent],
      providers: [provideZoneChangeDetection()],
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
    return element.querySelector('#guest-ci-error')?.textContent?.trim();
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
        { ci: null, phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });

    it.each(['1234', '12a45', '12 345', '12345678901', '   '])(
      'shows the CI rule and does not emit for "%s"',
      async (ci) => {
        await type('CI (opcional)', ci);

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
        { ci: '1234567890', phoneNumber: '70000000', name: 'Ana Rojas', email: 'ana@mail.test' },
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
      await restore({ ci: '12345', phoneNumber: '70000000', name: 'Ana Rojas', email: null });

      expect(field('CI (opcional)').value).toBe('12345');
      expect(field('Nombre completo').value).toBe('Ana Rojas');
      await submit();
      expect(submitted).toEqual([
        { ci: '12345', phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });

    it('restores a new patient without CI', async () => {
      await restore({ ci: null, phoneNumber: '70000000', name: 'Ana Rojas' });

      expect(field('CI (opcional)').value).toBe('');
      await submit();
      expect(submitted).toEqual([
        { ci: null, phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });
  });
});
