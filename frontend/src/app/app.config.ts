import { DEFAULT_DIALOG_CONFIG, DialogConfig } from '@angular/cdk/dialog';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import localeEs from '@angular/common/locales/es';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import {
  apiUrlInterceptor,
  authInterceptor,
  languageInterceptor,
} from './core/http/api.interceptors';
import { I18nTitleStrategy } from './core/i18n/i18n-title.strategy';
import { I18nService } from './core/i18n/i18n.service';
import { LOCALE_ID_PROVIDER } from './core/i18n/locale-id.provider';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: TitleStrategy, useExisting: I18nTitleStrategy },
    provideHttpClient(
      withXhr(),
      withInterceptors([apiUrlInterceptor, languageInterceptor, authInterceptor]),
    ),
    provideAppInitializer(() => inject(I18nService).init()),
    LOCALE_ID_PROVIDER,
    {
      provide: DEFAULT_DIALOG_CONFIG,
      useValue: { ...new DialogConfig(), backdropClass: 'glass-backdrop', ariaModal: true },
    },
  ],
};
