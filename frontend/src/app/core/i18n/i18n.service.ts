import { Injectable, signal } from '@angular/core';

export type SupportedLang = 'es' | 'en';

type TranslationDictionary = Record<string, unknown>;

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly defaultLang: SupportedLang = this.detectInitialLang();

  readonly currentLang = signal<SupportedLang>(this.defaultLang);
  private readonly loaded = signal<Partial<Record<SupportedLang, TranslationDictionary>>>({});
  private readonly pending = new Map<SupportedLang, Promise<void>>();

  private detectInitialLang(): SupportedLang {
    const saved = localStorage.getItem('lang');
    if (saved === 'es' || saved === 'en') {
      return saved;
    }
    const browserLang = navigator.language.slice(0, 2);
    return browserLang === 'es' ? 'es' : 'en';
  }

  init(): Promise<void> {
    return this.loadDictionary(this.currentLang());
  }

  async setLanguage(lang: SupportedLang): Promise<void> {
    if (this.currentLang() === lang && this.loaded()[lang]) return;
    await this.loadDictionary(lang);
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
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
