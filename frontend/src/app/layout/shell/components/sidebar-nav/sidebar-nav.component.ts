import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { NavItem } from '../../../../core/navigation/navigation';
import { initials } from '../../../../core/utils/labels.util';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon.component';

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, UiIconComponent, TranslatePipe],
  templateUrl: './sidebar-nav.component.html',
  host: {
    class:
      'glass-panel z-40 m-4 flex w-72 shrink-0 flex-col rounded-3xl !border-white/70 transition-transform duration-300 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:max-w-[calc(100vw-2rem)] lg:sticky lg:top-4 lg:z-10 lg:h-[calc(100vh-2rem)] lg:self-start',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNavComponent {
  private readonly i18n = inject(I18nService);

  navItems = input.required<NavItem[]>();
  clinicName = input<string | undefined>(undefined);
  roleLabel = input('');

  logout = output<void>();

  protected readonly resolvedClinicName = computed(() => {
    this.i18n.currentLang();
    return this.clinicName() || this.i18n.translate('shared.defaultClinicName');
  });

  protected readonly clinicInitials = computed(() => initials(this.resolvedClinicName()));
}
