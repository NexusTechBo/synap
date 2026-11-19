import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { HOME_URL } from '../../../../core/navigation/navigation';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { PulsoLogoComponent } from '../../../../shared/ui/pulso-logo/pulso-logo.component';
import { LANDING_NAV } from '../../constants/landing.content';

@Component({
  selector: 'app-header-landing-page',
  templateUrl: './header-landing-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PulsoLogoComponent, RouterLink, TranslatePipe],
})
export class HeaderLandingPageComponent {
  private readonly auth = inject(AuthService);
  protected readonly nav = LANDING_NAV;
  protected readonly homeUrl = HOME_URL;
  private readonly restored = toSignal(this.auth.restoreStoredSession(), { initialValue: null });
  protected readonly authState = computed<'pending' | 'loggedIn' | 'guest'>(() => {
    if (this.auth.session()) return 'loggedIn';
    return this.restored() === null ? 'pending' : 'guest';
  });
}
