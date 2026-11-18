import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Specialty } from '../../../core/models/api.models';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-specialty-filter',
  imports: [TranslatePipe],
  templateUrl: './specialty-filter.component.html',
  host: {
    class: 'flex flex-wrap gap-2',
    role: 'group',
    '[attr.aria-label]': 'ariaLabel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecialtyFilterComponent {
  private readonly i18n = inject(I18nService);
  readonly ariaLabel = computed(() => this.i18n.translate('shared.specialtyFilter.ariaLabel'));
  readonly specialties = input.required<readonly Specialty[]>();
  readonly selectedId = input<number | null>(null);
  readonly select = output<number | null>();
}
