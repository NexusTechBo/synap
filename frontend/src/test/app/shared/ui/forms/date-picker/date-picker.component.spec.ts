import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EN_TRANSLATIONS } from '../../../../../../app/core/i18n/en';
import { ES_TRANSLATIONS } from '../../../../../../app/core/i18n/es';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { DatePickerComponent } from '../../../../../../app/shared/ui/forms/date-picker/date-picker.component';

describe('DatePickerComponent', () => {
  let fixture: ComponentFixture<DatePickerComponent>;
  let element: HTMLElement;

  async function render(language: string, value: string | null): Promise<void> {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZoneChangeDetection(),
        {
          provide: I18nService,
          useFactory: () => {
            const i18n = new I18nService();
            i18n['loaded'].set({ es: ES_TRANSLATIONS, en: EN_TRANSLATIONS });
            return i18n;
          },
        },
      ],
    });
    fixture = TestBed.createComponent(DatePickerComponent);
    element = fixture.nativeElement;
    fixture.componentInstance.writeValue(value);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  async function open(): Promise<void> {
    element.querySelector('button')!.click();
    await fixture.whenStable();
  }

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  describe('in an English browser', () => {
    it('shows the English placeholder without a value', async () => {
      await render('en-US', null);

      expect(element.textContent).toContain('Select date');
    });

    it('shows the selected date in English', async () => {
      await render('en-US', '2026-11-05');

      expect(element.textContent).toContain('Nov 5');
    });

    it('translates the dialog aria-label and the today button', async () => {
      await render('en-US', null);
      await open();

      const dialog = document.querySelector('[role="dialog"]')!;
      expect(dialog.getAttribute('aria-label')).toBe('Select date');
      expect(dialog.textContent).toContain('Today');
      expect(dialog.textContent).not.toContain('Hoy');
    });
  });

  describe('in a Spanish browser', () => {
    it('shows the Spanish placeholder and date', async () => {
      await render('es-BO', null);
      expect(element.textContent).toContain('Seleccionar fecha');
      fixture.destroy();

      await render('es-BO', '2026-11-05');
      expect(element.textContent).toContain('5 nov');
    });
  });
});
