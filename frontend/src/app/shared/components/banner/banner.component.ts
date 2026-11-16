import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UiIconComponent } from '../../ui/ui-icon/ui-icon.component';

@Component({
  selector: 'app-banner',
  imports: [UiIconComponent, TranslatePipe],
  templateUrl: './banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent {}
