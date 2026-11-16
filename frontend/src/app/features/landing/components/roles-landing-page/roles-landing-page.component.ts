import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon.component';
import { LANDING_ANCHORS, LANDING_ROLES } from '../../constants/landing.content';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-roles-landing-page',
  imports: [UiIconComponent, RevealDirective, TranslatePipe],
  templateUrl: './roles-landing-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesLandingPageComponent {
  protected readonly anchor = LANDING_ANCHORS.roles;
  protected readonly roles = LANDING_ROLES;
}
