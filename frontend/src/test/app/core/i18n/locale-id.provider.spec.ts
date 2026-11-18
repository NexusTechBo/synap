import { formatDate, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LOCALE_ID_PROVIDER } from '../../../../app/core/i18n/locale-id.provider';

describe('LOCALE_ID_PROVIDER', () => {
  const date = new Date(2026, 10, 18);

  function localeFor(browserLanguage: string): string {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLanguage);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [LOCALE_ID_PROVIDER] });
    return TestBed.inject(LOCALE_ID);
  }

  beforeAll(() => registerLocaleData(localeEs));

  afterEach(() => vi.restoreAllMocks());

  it('uses the Spanish locale for a Spanish browser', () => {
    const locale = localeFor('es-BO');

    expect(locale).toBe('es-ES');
    expect(formatDate(date, 'EEEE d MMMM', locale)).toBe('miércoles 18 noviembre');
  });

  it('uses the English locale for any other browser', () => {
    const locale = localeFor('en-US');

    expect(locale).toBe('en-US');
    expect(formatDate(date, 'EEEE d MMMM', locale)).toBe('Wednesday 18 November');
  });
});
