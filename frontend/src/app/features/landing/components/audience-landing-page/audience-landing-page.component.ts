import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon.component';
import { LANDING_ANCHORS, LANDING_AUDIENCES } from '../../constants/landing.content';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-audience-landing-page',
  imports: [UiIconComponent, RevealDirective, TranslatePipe],
  templateUrl: './audience-landing-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AudienceLandingPageComponent {
  protected readonly anchor = LANDING_ANCHORS.audience;
  protected readonly audiences = LANDING_AUDIENCES;
}
