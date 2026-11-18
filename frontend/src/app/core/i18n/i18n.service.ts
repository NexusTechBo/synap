import { Injectable, computed, signal } from '@angular/core';

export type SupportedLang = 'es' | 'en';

const INTL_LOCALES: Record<SupportedLang, string> = { es: 'es-ES', en: 'en-US' };

type TranslationDictionary = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  readonly currentLang = signal<SupportedLang>(
    navigator.language.slice(0, 2) === 'es' ? 'es' : 'en',
  );
  readonly intlLocale = computed(() => INTL_LOCALES[this.currentLang()]);
  private readonly loaded = signal<Partial<Record<SupportedLang, TranslationDictionary>>>({});
  private readonly pending = new Map<SupportedLang, Promise<void>>();

  init(): Promise<void> {
    document.documentElement.lang = this.currentLang();
    return this.loadDictionary(this.currentLang());
  }

  translate(key: string): string {
    const lang = this.currentLang();
    const dictionary = this.loaded()[lang];
    if (!dictionary) return key;

    const value = key
      .split('.')
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined,
        dictionary,
      );
    return typeof value === 'string' ? value : key;
  }

  private loadDictionary(lang: SupportedLang): Promise<void> {
    if (this.loaded()[lang]) return Promise.resolve();

    const existing = this.pending.get(lang);
    if (existing) return existing;

    const request = (
      lang === 'es'
        ? import('./es').then((m) => m.ES_TRANSLATIONS)
        : import('./en').then((m) => m.EN_TRANSLATIONS)
    )
      .then((dict) => {
        this.loaded.update((prev) => ({ ...prev, [lang]: dict as TranslationDictionary }));
      })
      .finally(() => {
        this.pending.delete(lang);
      });

    this.pending.set(lang, request);
    return request;
  }
}
