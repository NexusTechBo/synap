import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Observable, catchError, finalize, map, of, shareReplay, throwError } from 'rxjs';
import { GuestApi } from '../api/guest.api';
import { apiErrorMessage, isRateLimited, retryAfterSeconds } from '../http/api-error';
import { I18nService } from '../i18n/i18n.service';
import { CountryCode, GuestTokenPayload } from '../models/api.models';
import { createCooldown } from '../utils/cooldown.util';

export type GuestSessionStatus = 'loading' | 'ready' | 'unavailable' | 'error';

interface GuestSession {
  token: string;
  clinicSlug: string;
  country: CountryCode | null;
  timezone: string | null;
  expiresAt: number;
}

const GUEST_TOKEN_KEY = 'scheduler.guestToken';
const EXPIRY_MARGIN_MS = 30_000;

function readStorage(): string | null {
  try {
    return sessionStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(GUEST_TOKEN_KEY);
    else sessionStorage.setItem(GUEST_TOKEN_KEY, value);
  } catch {}
}

function decodeGuestSession(token: string | null, slug: string): GuestSession | null {
  if (!token) return null;
  try {
    const payload = jwtDecode<GuestTokenPayload>(token);
    if (payload.role !== 'GUEST' || payload.clinicSlug !== slug) return null;
    return {
      token,
      clinicSlug: payload.clinicSlug,
      country: payload.country ?? null,
      timezone: payload.timezone ?? null,
      expiresAt: payload.exp * 1000,
    };
  } catch {
    return null;
  }
}

function isFresh(session: GuestSession | null): session is GuestSession {
  return !!session && session.expiresAt - EXPIRY_MARGIN_MS > Date.now();
}

@Injectable({ providedIn: 'root' })
export class GuestSessionService {
  private readonly guestApi = inject(GuestApi);
  private readonly i18n = inject(I18nService);

  private slug: string | null = null;
  private session: GuestSession | null = null;
  private pending: Observable<string> | null = null;
  private contextActive = false;

  private readonly _status = signal<GuestSessionStatus>('loading');
  private readonly _message = signal<string | null>(null);
  private readonly _timezone = signal<string | null>(null);
  private readonly _country = signal<CountryCode | null>(null);
  private readonly cooldown = createCooldown();

  readonly timezone = this._timezone.asReadonly();
  readonly country = this._country.asReadonly();
  readonly status = this._status.asReadonly();
  readonly message = this._message.asReadonly();
  readonly ready = computed(() => this._status() === 'ready');
  readonly coolingDown = this.cooldown.active;
  readonly retryInLabel = this.cooldown.label;
  readonly cooldownFinished = this.cooldown.finished;

  start(slug: string | null): void {
    this.cooldown.reset();
    this.contextActive = true;
    this.slug = slug?.trim() || null;
    this.pending = null;
    if (!this.slug) {
      this.setStatus('unavailable', this.i18n.translate('guestBooking.unavailableMessage'));
      return;
    }
    const stored = decodeGuestSession(readStorage(), this.slug);
    if (isFresh(stored)) {
      this.setSession(stored);
      this.setStatus('ready');
      return;
    }
    this.clear();
    this.ensureToken().subscribe({ error: () => undefined });
  }

  retry(): void {
    if (this.cooldown.active()) return;
    this.start(this.slug);
  }

  ensureToken(): Observable<string> {
    if (isFresh(this.session)) return of(this.session.token);
    const slug = this.slug;
    if (!slug) return throwError(() => new Error('No guest session'));
    if (this._status() !== 'ready') this.setStatus('loading');
    if (this.pending) return this.pending;
    const request: Observable<string> = this.guestApi.createSession({ slug: slug }).pipe(
      map(({ token }) => {
        const session = decodeGuestSession(token, slug);
        if (!session) throw new Error('Invalid guest token');
        this.setSession(session);
        writeStorage(token);
        this.setStatus('ready');
        return token;
      }),
      catchError((error: unknown) => {
        this.fail(error);
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.pending === request) this.pending = null;
      }),
      shareReplay(1),
    );
    this.pending = request;
    return request;
  }

  releaseClinicContext(): void {
    this.contextActive = false;
    this._timezone.set(null);
    this._country.set(null);
  }

  clear(): void {
    this.setSession(null);
    writeStorage(null);
  }

  fail(error: unknown): void {
    if (isRateLimited(error)) {
      if (this._status() === 'ready') return;
      const retryAfter = retryAfterSeconds(error);
      if (retryAfter) this.cooldown.start(retryAfter);
    }
    const unavailable =
      error instanceof HttpErrorResponse &&
      (error.status === HttpStatusCode.NotFound || error.status === HttpStatusCode.BadRequest);
    if (unavailable)
      this.setStatus('unavailable', this.i18n.translate('guestBooking.unavailableMessage'));
    else
      this.setStatus(
        'error',
        apiErrorMessage(error, this.i18n, this.i18n.translate('guestBooking.startError')),
      );
  }

  private setSession(session: GuestSession | null): void {
    this.session = session;
    this._timezone.set(this.contextActive ? (session?.timezone ?? null) : null);
    this._country.set(this.contextActive ? (session?.country ?? null) : null);
  }

  private setStatus(status: GuestSessionStatus, message: string | null = null): void {
    this._status.set(status);
    this._message.set(message);
  }
}
