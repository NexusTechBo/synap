import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { PulsoLogoComponent } from '../../../../shared/ui/pulso-logo/pulso-logo.component';
import { MoonshineLogoComponent } from '../moonshine-logo/moonshine-logo.component';

@Component({
  selector: 'app-footer-landing-page',
  imports: [TranslatePipe, PulsoLogoComponent, MoonshineLogoComponent],
  templateUrl: './footer-landing-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterLandingPageComponent {
  protected readonly year = new Date().getFullYear();
}
