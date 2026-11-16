import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ClinicsApi } from '../../core/api/clinics.api';
import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage, retryAfterSeconds } from '../../core/http/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { createCooldown } from '../../core/utils/cooldown.util';
import { ActivationState } from './activation.model';

@Injectable()
export class ActivationService {
  private readonly clinicsApi = inject(ClinicsApi);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  private readonly cooldown = createCooldown();

  private readonly _state = signal<ActivationState>({ status: 'loading' });
  readonly state = this._state.asReadonly();
  readonly coolingDown = this.cooldown.active;
  readonly cooldownFinished = this.cooldown.finished;
  private token: string | null = null;
  private started = false;

  readonly status = computed(() => this._state().status);
  readonly result = computed(() => {
    const state = this._state();
    return state.status === 'success' ? state.result : null;
  });
  readonly errorMessage = computed(() => {
    const state = this._state();
    return state.status === 'error' ? state.message : null;
  });
  readonly retryLabel = computed(() => {
    this.i18n.currentLang();
    return this.cooldown.active()
      ? `${this.i18n.translate('activation.retryIn')} ${this.cooldown.label()}`
      : this.i18n.translate('activation.retryButton');
  });
  readonly hasSession = computed(() => {
    const session = this.auth.session();
    return session !== null && session.expiresAt > Date.now();
  });

  continueToLogin(): void {
    const username = this.result()?.adminUsername;
    if (!username) return;
    this.auth.logout({ state: { username } });
  }

  activate(token: string | null): void {
    if (this.started) return;
    this.started = true;
    this.token = token?.trim() || null;
    this.send();
  }

  retry(): void {
    if (this._state().status !== 'error' || this.cooldown.active()) return;
    this.cooldown.reset();
    this.send();
  }

  private send(): void {
    const token = this.token;
    if (!token) {
      this._state.set({ status: 'invalid' });
      return;
    }
    this._state.set({ status: 'loading' });
    this.clinicsApi.activate(token).subscribe({
      next: (result) => {
        this.token = null;
        this._state.set({ status: 'success', result });
      },
      error: (error) => {
        if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.BadRequest) {
          this.token = null;
          this._state.set({ status: 'invalid' });
          return;
        }
        const retryAfter = retryAfterSeconds(error);
        if (retryAfter) this.cooldown.start(retryAfter);
        this._state.set({
          status: 'error',
          message: apiErrorMessage(error, this.i18n.translate('activation.defaultError')),
        });
      },
    });
  }
}
