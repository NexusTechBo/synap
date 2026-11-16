import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, fromEvent } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Role } from '../../core/models/api.models';
import { navItemsFor } from '../../core/navigation/navigation';
import { GlassBackgroundComponent } from '../../shared/ui/glass-background/glass-background.component';
import { SidebarNavComponent } from './components/sidebar-nav/sidebar-nav.component';
import { TopbarComponent } from './components/topbar/topbar.component';

const ROLE_ORDER: readonly Role[] = ['ADMINISTRATOR', 'DOCTOR', 'ASSISTANT'];

@Component({
  selector: 'app-shell',
  imports: [
    CdkTrapFocus,
    GlassBackgroundComponent,
    RouterOutlet,
    SidebarNavComponent,
    TopbarComponent,
  ],
  templateUrl: './shell.component.html',
  host: { '(document:keydown.escape)': 'closeNav()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly drawerTrap = viewChild.required(CdkTrapFocus);

  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected readonly navOpen = signal(false);
  private focusBeforeOpen: HTMLElement | null = null;

  protected readonly navItems = computed(() => navItemsFor(this.auth.roles()));
  protected readonly userName = this.auth.displayName;
  protected readonly roleLabel = computed(() => {
    this.i18n.currentLang();
    const userRoles = this.auth.roles();
    return ROLE_ORDER.filter((role) => userRoles.includes(role))
      .map((role) => this.i18n.translate(`roles.${role}`))
      .join(' · ');
  });
  protected readonly clinicName = computed(() => this.auth.clinic()?.name ?? '');

  constructor() {
    const router = inject(Router);

    effect(() => {
      if (!this.auth.session()) untracked(() => router.navigate(['/login']).finally()).finally();
    });

    router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navOpen.set(false));

    fromEvent<MediaQueryListEvent>(matchMedia('(min-width: 1024px)'), 'change')
      .pipe(
        filter((event) => event.matches),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeNav());
  }

  protected openNav(): void {
    this.focusBeforeOpen = document.activeElement as HTMLElement | null;
    this.navOpen.set(true);
    this.drawerTrap().focusTrap.focusFirstTabbableElementWhenReady().finally();
  }

  protected onNavClick(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest('a')) this.closeNav();
  }

  protected closeNav(): void {
    if (!this.navOpen()) return;
    this.navOpen.set(false);
    this.focusBeforeOpen?.focus();
  }

  protected logout(): void {
    this.auth.logout();
  }
}
