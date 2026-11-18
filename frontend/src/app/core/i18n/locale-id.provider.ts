import { LOCALE_ID, Provider, inject } from '@angular/core';
import { I18nService } from './i18n.service';

export const LOCALE_ID_PROVIDER: Provider = {
  provide: LOCALE_ID,
  useFactory: () => inject(I18nService).intlLocale(),
};
