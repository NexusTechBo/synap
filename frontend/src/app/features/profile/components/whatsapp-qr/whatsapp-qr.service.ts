import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Observable,
  catchError,
  concat,
  defer,
  distinctUntilChanged,
  exhaustMap,
  finalize,
  from,
  ignoreElements,
  map,
  repeat,
  switchMap,
  takeWhile,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { WhatsappApi } from '../../../../core/api/whatsapp.api';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { WhatsappSessionStatusResponse } from '../../../../core/models/api.models';
import { NotificationService } from '../../../../shared/services/notification.service';

export type WhatsappLinkMethod = 'qr' | 'code';

export type WhatsappView =
  'loading' | 'connected' | 'linking' | 'reconnecting' | 'expired' | 'error';

const STATUS_POLL_MS = 3_000;
const QR_REFRESH_MS = 20_000;
const QR_MAX_CODES = 6;
const PAIRING_CODE_TTL_MS = 160_000;

function comparableDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length === 13 && digits[4] === '9') {
    return digits.slice(0, 4) + digits.slice(5);
  }
  return digits;
}

function prefersCodeMethod(): boolean {
  return globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
}

function withJsonErrorBody(error: unknown): Observable<never> {
  if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) {
    return throwError(() => error);
  }
  return from(error.error.text()).pipe(
    switchMap((text) => {
      let body: unknown = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      return throwError(
        () =>
          new HttpErrorResponse({
            error: body,
            headers: error.headers,
            status: error.status,
            url: error.url ?? undefined,
          }),
      );
    }),
  );
}

@Injectable()
export class WhatsappQrService {
  private readonly api = inject(WhatsappApi);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  private readonly run = signal(0);

  private readonly _session = signal<WhatsappSessionStatusResponse | null>(null);
  private readonly _qrUrl = signal<string | null>(null);
  private readonly _error = signal<string | null>(null);
  private readonly _expired = signal(false);
  private readonly _loggingOut = signal(false);
  private readonly preferredMethod = signal<WhatsappLinkMethod>(
    prefersCodeMethod() ? 'code' : 'qr',
  );
  private readonly _pairingCode = signal<string | null>(null);

  readonly session = this._session.asReadonly();
  readonly qrUrl = this._qrUrl.asReadonly();
  readonly error = this._error.asReadonly();
  readonly expired = this._expired.asReadonly();
  readonly loggingOut = this._loggingOut.asReadonly();
  readonly pairingCode = this._pairingCode.asReadonly();

  readonly status = computed(() => this.session()?.status ?? null);
  readonly statusLabel = computed(() => {
    this.i18n.currentLang();
    const status = this.status();
    if (!status) return '';
    const key =
      status === 'QR_PENDING' || status === 'PAIRING_PENDING'
        ? this.method() === 'code'
          ? 'PAIRING_PENDING'
          : 'QR_PENDING'
        : status;
    return this.i18n.translate(`profile.whatsapp.status.${key}`);
  });
  readonly clinicPhoneNumber = computed(() => this.session()?.clinicPhoneNumber ?? null);
  readonly canUseCode = computed(() => !!this.clinicPhoneNumber());
  readonly method = computed<WhatsappLinkMethod>(() =>
    this.canUseCode() ? this.preferredMethod() : 'qr',
  );
  readonly linkedPhoneNumber = computed(() => this.session()?.linkedPhoneNumber ?? null);
  readonly phoneMismatch = computed(() => {
    const linked = this.linkedPhoneNumber();
    const clinic = this.clinicPhoneNumber();
    return (
      this.status() === 'READY' &&
      !!linked &&
      !!clinic &&
      comparableDigits(linked) !== comparableDigits(clinic)
    );
  });
  readonly view = computed<WhatsappView>(() => {
    if (this.error()) return 'error';
    const status = this.status();
    if (!status) return 'loading';
    if (status === 'READY') return 'connected';
    if (status === 'DISCONNECTED') return 'reconnecting';
    return this.expired() ? 'expired' : 'linking';
  });

  constructor() {
    toObservable(this.run)
      .pipe(
        switchMap(() => this.pollStatus()),
        takeUntilDestroyed(),
      )
      .subscribe();

    toObservable(computed(() => (this.view() === 'linking' ? this.method() : null)))
      .pipe(
        distinctUntilChanged(),
        switchMap((method) => {
          this.setQr(null);
          this._pairingCode.set(null);
          if (method === 'qr') return this.refreshQr();
          if (method === 'code') return this.requestPairingCode();
          return EMPTY;
        }),
        takeUntilDestroyed(),
      )
      .subscribe();

    inject(DestroyRef).onDestroy(() => this.setQr(null));
  }

  selectMethod(method: WhatsappLinkMethod): void {
    this.preferredMethod.set(method);
  }

  useQr(): void {
    this.preferredMethod.set('qr');
    this.restart();
  }

  restart(): void {
    this._error.set(null);
    this._expired.set(false);
    this._session.set(null);
    this.run.update((n) => n + 1);
  }

  logout(): Observable<void> {
    this._loggingOut.set(true);
    return this.api.logout().pipe(
      tap(() => this.restart()),
      finalize(() => this._loggingOut.set(false)),
    );
  }

  private pollStatus(): Observable<never> {
    return timer(0, STATUS_POLL_MS).pipe(
      exhaustMap(() => this.api.status()),
      takeWhile((session) => session.status !== 'READY' && !this.expired(), true),
      tap((session) => this.onStatus(session)),
      ignoreElements(),
      catchError((error) => this.fail(error, this.i18n.translate('profile.whatsapp.statusError'))),
    );
  }

  private refreshQr(): Observable<never> {
    return concat(
      defer(() => this.fetchQr()).pipe(
        tap((qr) => this.setQr(qr)),
        repeat({ count: QR_MAX_CODES, delay: QR_REFRESH_MS }),
      ),
      timer(QR_REFRESH_MS).pipe(tap(() => this._expired.set(true))),
    ).pipe(
      ignoreElements(),
      catchError((error) => this.fail(error, this.i18n.translate('profile.whatsapp.qrError'))),
    );
  }

  private requestPairingCode(): Observable<never> {
    return concat(
      this.api.pairingCode().pipe(tap((response) => this._pairingCode.set(response.code))),
      timer(PAIRING_CODE_TTL_MS).pipe(tap(() => this._expired.set(true))),
    ).pipe(
      ignoreElements(),
      catchError((error) =>
        this.fail(error, this.i18n.translate('profile.whatsapp.pairingCodeError')),
      ),
    );
  }

  private fetchQr(): Observable<Blob | null> {
    return this.api.qr().pipe(
      map((response) => (response.status === HttpStatusCode.NoContent ? null : response.body)),
      catchError(withJsonErrorBody),
    );
  }

  private onStatus(session: WhatsappSessionStatusResponse): void {
    const previous = this.status();
    this._session.set(session);
    if (
      previous === 'PAIRING_PENDING' &&
      session.status === 'IDLE' &&
      this.method() === 'code' &&
      this._pairingCode() !== null
    ) {
      this._expired.set(true);
    }
    if (session.status === 'READY' && previous && previous !== 'READY') {
      this.notifications.success(this.i18n.translate('profile.whatsapp.linkedSuccess'));
    }
  }

  private fail(error: unknown, fallback: string): Observable<never> {
    this._error.set(apiErrorMessage(error, this.i18n, fallback));
    return EMPTY;
  }

  private setQr(qr: Blob | null): void {
    const previous = this._qrUrl();
    if (previous) URL.revokeObjectURL(previous);
    this._qrUrl.set(qr ? URL.createObjectURL(qr) : null);
  }
}
