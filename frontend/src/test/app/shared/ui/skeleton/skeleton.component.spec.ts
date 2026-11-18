import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EN_TRANSLATIONS } from '../../../../../app/core/i18n/en';
import { ES_TRANSLATIONS } from '../../../../../app/core/i18n/es';
import { I18nService } from '../../../../../app/core/i18n/i18n.service';
import { SkeletonComponent } from '../../../../../app/shared/ui/skeleton/skeleton.component';

describe('SkeletonComponent', () => {
  function screenReaderText(language: string): string {
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
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.sr-only').textContent;
  }

  afterEach(() => vi.restoreAllMocks());

  it('announces loading in English for an English browser', () => {
    expect(screenReaderText('en-US')).toBe('Loading...');
  });

  it('announces loading in Spanish for a Spanish browser', () => {
    expect(screenReaderText('es-BO')).toBe('Cargando...');
  });

  it('renders the requested number of rows', () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput('rows', 3);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });
});
