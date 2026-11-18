import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClinicClockService } from '../../../../core/clinic/clinic-clock.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { firstName, initials } from '../../../../core/utils/labels.util';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon.component';

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, UiIconComponent, TranslatePipe],
  templateUrl: './topbar.component.html',
  host: {
    class:
      'flex items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6 lg:px-8 lg:py-6 max-lg:sticky max-lg:top-0 max-lg:z-20 max-lg:border-b max-lg:border-white/70 max-lg:bg-white/70 max-lg:backdrop-blur-xl',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly i18n = inject(I18nService);
  private readonly clock = inject(ClinicClockService);

  userName = input('');
  roleLabel = input('');
  menuOpen = input(false);

  menu = output<void>();

  protected readonly today = computed(() => {
    return new Intl.DateTimeFormat(this.i18n.intlLocale(), {
      timeZone: this.clock.timezone(),
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  });

  protected readonly greeting = computed(() => {
    const hour = this.clock.hour();
    const key =
      hour < 12
        ? 'nav.greetings.morning'
        : hour < 19
          ? 'nav.greetings.afternoon'
          : 'nav.greetings.evening';
    return this.i18n.translate(key);
  });

  protected readonly givenName = computed(() => firstName(this.userName()));
  protected readonly avatarInitials = computed(() => initials(this.userName()));
}
