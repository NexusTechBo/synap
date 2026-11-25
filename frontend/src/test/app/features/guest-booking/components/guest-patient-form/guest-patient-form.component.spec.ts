import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClinicCountryService } from '../../../../../../app/core/clinic/clinic-country.service';
import { CountryCode, GuestBookingPatient } from '../../../../../../app/core/models/api.models';
import { GuestPatientFormComponent } from '../../../../../../app/features/guest-booking/components/guest-patient-form/guest-patient-form.component';
import {
  CI_MESSAGE,
  CPF_MESSAGE,
  FormDom,
  expectTooltipLegendNamesFieldset,
  formDom,
} from '../../../../../testing/form-dom';

interface SetupOptions {
  country?: CountryCode;
  phonePlaceholder?: string;
}

const RETURNING = 'Ya me atendí en este espacio de trabajo';
const NEW = 'Es mi primera vez';

describe('GuestPatientFormComponent', () => {
  let fixture: ComponentFixture<GuestPatientFormComponent>;
  let element: HTMLElement;
  let dom: FormDom;
  let submitted: GuestBookingPatient[];

  async function setup({
    country = 'BO',
    phonePlaceholder = '',
  }: SetupOptions = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [GuestPatientFormComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal(country), phonePlaceholder: signal(phonePlaceholder) },
        },
      ],
    });
    fixture = TestBed.createComponent(GuestPatientFormComponent);
    dom = formDom(fixture);
    submitted = [];
    fixture.componentInstance.submitted.subscribe((patient) => submitted.push(patient));
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function submit(): Promise<void> {
    return dom.clickButton('Continuar');
  }

  function ciError(): string | undefined {
    return element.querySelector('#guest-document-error')?.textContent?.trim();
  }

  it('keeps the legend as the first child of the fieldset and names the group after its text', async () => {
    await setup();

    expectTooltipLegendNamesFieldset(element, '¿Ya te atendiste en este espacio de trabajo?');
  });

  describe('returning patient', () => {
    beforeEach(async () => {
      await setup();
      await dom.chooseRadio(RETURNING);
    });

    it('shows no CI field and explains that the phone is needed', () => {
      expect(dom.findField('CI (opcional)')).toBeNull();
      expect(element.textContent).toContain('Ingresa el teléfono con el que te registraste.');
    });

    it('emits only the phone number', async () => {
      await dom.type('Teléfono', ' 70000000 ');

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
      await setup();
      await dom.chooseRadio(NEW);
      await dom.type('Nombre completo', ' Ana Rojas ');
      await dom.type('Teléfono', '70000000');
    });

    it('limits the optional CI input to 10 characters', () => {
      expect(dom.field('CI (opcional)').getAttribute('maxlength')).toBe('10');
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
        await dom.type('CI (opcional)', document);

        expect(ciError()).toBe(CI_MESSAGE);
        await submit();
        expect(submitted).toEqual([]);
      },
    );

    it('emits the CI when valid', async () => {
      await dom.type('CI (opcional)', '1234567890');
      await dom.type('Email (opcional)', 'ana@mail.test');

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
    beforeEach(() => setup());

    async function restore(initial: GuestBookingPatient): Promise<void> {
      fixture.componentRef.setInput('initial', initial);
      fixture.componentInstance.ngOnInit();
      await fixture.whenStable();
    }

    it('restores a returning patient (no name)', async () => {
      await restore({ phoneNumber: '70000000' });

      expect(dom.findField('CI (opcional)')).toBeNull();
      expect(dom.field('Teléfono').value).toBe('70000000');
      await submit();
      expect(submitted).toEqual([{ phoneNumber: '70000000' }]);
    });

    it('restores a new patient with CI', async () => {
      await restore({ document: '12345', phoneNumber: '70000000', name: 'Ana Rojas', email: null });

      expect(dom.field('CI (opcional)').value).toBe('12345');
      expect(dom.field('Nombre completo').value).toBe('Ana Rojas');
      await submit();
      expect(submitted).toEqual([
        { document: '12345', phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });

    it('restores a new patient without CI', async () => {
      await restore({ document: null, phoneNumber: '70000000', name: 'Ana Rojas' });

      expect(dom.field('CI (opcional)').value).toBe('');
      await submit();
      expect(submitted).toEqual([
        { document: null, phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      ]);
    });
  });

  describe('document by country', () => {
    beforeEach(async () => {
      await setup({ country: 'BR', phonePlaceholder: '+55 11 91234-5678' });
      await dom.chooseRadio(NEW);
    });

    it('shows the CPF label, placeholders and a 14 character limit in a BR clinic', () => {
      expect(dom.field('CPF (opcional)').placeholder).toBe('000.000.000-00');
      expect(dom.field('CPF (opcional)').getAttribute('maxlength')).toBe('14');
      expect(dom.field('Teléfono').placeholder).toBe('+55 11 91234-5678');
      expect(dom.findField('CI (opcional)')).toBeNull();
    });

    it('emits a valid CPF as document', async () => {
      await dom.type('Nombre completo', 'Ana Rojas');
      await dom.type('Teléfono', '11912345678');
      await dom.type('CPF (opcional)', '529.982.247-25');

      await submit();

      expect(submitted).toEqual([
        { document: '529.982.247-25', phoneNumber: '11912345678', name: 'Ana Rojas', email: null },
      ]);
    });

    it('blocks submit and shows the CPF message for an invalid CPF', async () => {
      await dom.type('Nombre completo', 'Ana Rojas');
      await dom.type('Teléfono', '11912345678');
      await dom.type('CPF (opcional)', '52998224724');

      await submit();

      expect(ciError()).toBe(CPF_MESSAGE);
      expect(submitted).toEqual([]);
    });
  });
});
