import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Pipe({ name: 'specialtyLabel', pure: false })
export class SpecialtyLabelPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(name: string | null | undefined): string {
    return name ?? this.i18n.translate('shared.noSpecialty');
  }
}
