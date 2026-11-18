import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackToHomeLinkComponent } from '../../../../shared/components/back-to-home-link/back-to-home-link.component';
import { ResendActivationComponent } from '../../../../shared/components/resend-activation/resend-activation.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon.component';

@Component({
  selector: 'app-register-success',
  imports: [
    BackToHomeLinkComponent,
    RouterLink,
    ResendActivationComponent,
    UiIconComponent,
    TranslatePipe,
  ],
  templateUrl: './register-success.component.html',
  host: {
    class: 'flex min-h-screen flex-col items-center justify-center gap-2 px-4 py-10 sm:px-6',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterSuccessComponent {
  readonly email = input.required<string>();

  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
  }
}
