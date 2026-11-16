import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FormFieldComponent } from '../../ui/forms/form-field/form-field.component';
import { ResendActivationService } from './resend-activation.service';

@Component({
  selector: 'app-resend-activation',
  imports: [ReactiveFormsModule, FormFieldComponent, TranslatePipe],
  providers: [ResendActivationService],
  templateUrl: './resend-activation.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResendActivationComponent implements OnInit {
  private readonly i18n = inject(I18nService);

  readonly email = input<string>();
  readonly label = input<string>();
  readonly fieldId = input('resend-activation-email');
  readonly startCooldown = input(false, { transform: booleanAttribute });

  protected readonly resend = inject(ResendActivationService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly buttonLabel = computed(() => {
    this.i18n.currentLang();
    if (this.resend.sending()) return this.i18n.translate('resendActivation.sending');
    const remaining = this.resend.remainingLabel();
    if (remaining) return `${this.i18n.translate('resendActivation.resendIn')} ${remaining}`;
    return this.label() ?? this.i18n.translate('resendActivation.defaultLabel');
  });

  ngOnInit(): void {
    if (this.startCooldown()) this.resend.startCooldown();
  }

  protected submit(): void {
    const fixedEmail = this.email();
    if (fixedEmail) {
      this.resend.resend(fixedEmail, false);
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.resend.resend(this.form.controls.email.value.trim());
  }
}
