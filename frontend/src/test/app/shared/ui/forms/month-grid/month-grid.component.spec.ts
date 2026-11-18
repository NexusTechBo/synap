import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EN_TRANSLATIONS } from '../../../../../../app/core/i18n/en';
import { ES_TRANSLATIONS } from '../../../../../../app/core/i18n/es';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { MonthGridComponent } from '../../../../../../app/shared/ui/forms/month-grid/month-grid.component';

describe('MonthGridComponent', () => {
  let fixture: ComponentFixture<MonthGridComponent>;
  let element: HTMLElement;

  async function render(language: string): Promise<void> {
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
    fixture = TestBed.createComponent(MonthGridComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('month', new Date(2026, 10, 1));
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  afterEach(() => vi.restoreAllMocks());

  describe('in an English browser', () => {
    beforeEach(() => render('en-US'));

    it('renders the month label in English', () => {
      expect(element.querySelector('p')?.textContent).toContain('November 2026');
    });

    it('renders English day aria-labels', () => {
      const label = element.querySelector('[data-iso="2026-11-18"]')?.getAttribute('aria-label');

      expect(label).toContain('Wednesday');
      expect(label).toContain('November');
    });

    it('translates the month navigation aria-labels', () => {
      const labels = [...element.querySelectorAll('button')].map((b) =>
        b.getAttribute('aria-label'),
      );

      expect(labels).toContain('Previous month');
      expect(labels).toContain('Next month');
    });

    it('renders English weekday headers', () => {
      expect(element.textContent).toContain('Mon');
    });
  });

  describe('in a Spanish browser', () => {
    beforeEach(() => render('es-BO'));

    it('renders Spanish month label and aria-labels', () => {
      const labels = [...element.querySelectorAll('button')].map((b) =>
        b.getAttribute('aria-label'),
      );

      expect(element.querySelector('p')?.textContent).toContain('Noviembre');
      expect(
        element.querySelector('[data-iso="2026-11-18"]')?.getAttribute('aria-label'),
      ).toContain('noviembre');
      expect(labels).toContain('Mes anterior');
    });
  });
});
