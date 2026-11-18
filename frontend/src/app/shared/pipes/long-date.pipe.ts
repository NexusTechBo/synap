import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatLongDate } from '../../core/utils/calendar.util';

@Pipe({ name: 'longDate', pure: false })
export class LongDatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(iso: string): string {
    return formatLongDate(iso, this.i18n.intlLocale());
  }
}
