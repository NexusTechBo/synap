import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-footer-landing-page',
  imports: [TranslatePipe],
  templateUrl: './footer-landing-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterLandingPageComponent {
  protected readonly year = new Date().getFullYear();
}
