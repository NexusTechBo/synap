import { TestBed } from '@angular/core/testing';
import { ES_TRANSLATIONS } from './app/core/i18n/es';
import { I18nService } from './app/core/i18n/i18n.service';

beforeEach(() => {
  localStorage.setItem('lang', 'es');
  TestBed.configureTestingModule({
    providers: [
      {
        provide: I18nService,
        useFactory: () => {
          const i18n = new I18nService();
          i18n['loaded'].set({ es: ES_TRANSLATIONS });
          return i18n;
        },
      },
    ],
  });
});
