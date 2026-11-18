import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../../../app/core/i18n/i18n.service';

describe('I18nService', () => {
  function create(browserLanguage: string): I18nService {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLanguage);
    return TestBed.inject(I18nService);
  }

  afterEach(() => vi.restoreAllMocks());

  it.each(['es', 'es-419', 'es-BO'])('uses es for browser language %s', (language) => {
    expect(create(language).currentLang()).toBe('es');
  });

  it.each(['en-US', 'pt-BR', 'fr'])('uses en for browser language %s', (language) => {
    expect(create(language).currentLang()).toBe('en');
  });

  it('ignores a language saved in localStorage', () => {
    localStorage.setItem('lang', 'es');

    expect(create('en-US').currentLang()).toBe('en');

    localStorage.clear();
  });

  it('translates keys after init in the browser language', async () => {
    const i18n = create('es-BO');
    await i18n.init();

    expect(i18n.translate('common.save')).toBe('Guardar');
  });

  it('returns the key when it is missing', async () => {
    const i18n = create('en-US');
    await i18n.init();

    expect(i18n.translate('missing.key')).toBe('missing.key');
  });

  it('translates keys in English for an English browser', async () => {
    const i18n = create('en-US');
    await i18n.init();

    expect(i18n.translate('common.save')).toBe('Save');
  });

  it.each([
    ['es-BO', 'es-ES'],
    ['en-US', 'en-US'],
    ['pt-BR', 'en-US'],
  ])('maps browser language %s to the Intl locale %s', (language, locale) => {
    expect(create(language).intlLocale()).toBe(locale);
  });

  it.each([
    ['es-BO', 'es'],
    ['en-US', 'en'],
  ])('sets the document language for browser language %s on init', async (language, lang) => {
    const i18n = create(language);
    document.documentElement.lang = 'xx';

    await i18n.init();

    expect(document.documentElement.lang).toBe(lang);
  });
});
