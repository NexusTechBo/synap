import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';

export const INVALID_EMAIL_KEY = 'validation.email';

const VALIDATION_MESSAGE_KEYS: Record<
  string,
  (error: { requiredLength?: number }) => { key: string; params?: Record<string, string | number> }
> = {
  required: () => ({ key: 'validation.required' }),
  email: () => ({ key: INVALID_EMAIL_KEY }),
  minlength: (error) => ({
    key: 'validation.minlength',
    params: { min: error.requiredLength ?? 0 },
  }),
  maxlength: (error) => ({
    key: 'validation.maxlength',
    params: { max: error.requiredLength ?? 0 },
  }),
  pattern: () => ({ key: 'validation.pattern' }),
};

export const ciValidator = Validators.pattern(/^\d{5,10}$/);
export const CI_ERRORS = { pattern: 'validation.ciPattern' };

export const phoneValidator = Validators.pattern(/^[\d\s()+-]{7,20}$/);
export const PHONE_ERRORS = {
  pattern: 'validation.phonePattern',
};

export const usernameValidator = Validators.pattern(/^[a-z0-9._-]{3,50}$/);
export const USERNAME_ERRORS = {
  pattern: 'validation.usernamePattern',
};

export function translateValidationKey(
  i18n: I18nService,
  keyOrMessage: string,
  params?: Record<string, string | number>,
): string {
  let text = i18n.translate(keyOrMessage);
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replace(`{${paramKey}}`, String(paramValue));
    }
  }
  return text;
}

export function getValidationErrorMessage(
  errors: ValidationErrors | null,
  i18n?: I18nService,
): string | null {
  if (!errors) return null;

  const key = Object.keys(errors)[0];
  const resolved = VALIDATION_MESSAGE_KEYS[key]?.(errors[key]) ?? {
    key: 'validation.invalidField',
  };
  return i18n ? translateValidationKey(i18n, resolved.key, resolved.params) : resolved.key;
}

export function notBlank(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}
