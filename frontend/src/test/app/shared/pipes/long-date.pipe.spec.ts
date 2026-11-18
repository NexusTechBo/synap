import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../../../app/core/i18n/i18n.service';
import { LongDatePipe } from '../../../../app/shared/pipes/long-date.pipe';

describe('LongDatePipe', () => {
  function format(language: string): string {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
    TestBed.resetTestingModule();
    return TestBed.runInInjectionContext(() => new LongDatePipe().transform('2026-11-05'));
  }

  afterEach(() => vi.restoreAllMocks());

  it('formats the date in English for an English browser', () => {
    expect(format('en-US')).toBe('Thursday, November 5, 2026');
  });

  it('formats the date in Spanish for a Spanish browser', () => {
    expect(format('es-BO')).toBe('Jueves, 5 de noviembre de 2026');
  });

  it('follows the language when it changes', () => {
    const i18n = TestBed.inject(I18nService);
    const pipe = TestBed.runInInjectionContext(() => new LongDatePipe());

    i18n.currentLang.set('en');

    expect(pipe.transform('2026-11-05')).toBe('Thursday, November 5, 2026');
  });
});
