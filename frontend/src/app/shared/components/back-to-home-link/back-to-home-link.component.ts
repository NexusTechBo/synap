import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UiIconComponent } from '../../ui/ui-icon/ui-icon.component';

@Component({
  selector: 'app-back-to-home-link',
  imports: [RouterLink, TranslatePipe, UiIconComponent],
  templateUrl: './back-to-home-link.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackToHomeLinkComponent {}
