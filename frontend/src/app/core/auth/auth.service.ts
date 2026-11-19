import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { DestroyRef, Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationExtras, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { EMPTY, Observable, catchError, firstValueFrom, from, map, of, throwError } from 'rxjs';
import { AuthApi } from '../api/auth.api';
import {
  ClinicLanguage,
  ClinicRegionalSettings,
  CountryCode,
  Role,
  Staff,
  TokenPayload,
} from '../models/api.models';
import { HOME_URL, SESSION_ACCESS, SessionAccess } from '../navigation/navigation';
import { isRole } from './roles';

interface Session {
  token: string;
  userId: number;
  roles: Role[];
  clinicId: number;
  clinicName: string;
  clinicSlug: string;
  username: string;
  country?: CountryCode;
  timezone?: string;
  defaultLanguage?: ClinicLanguage;
  expiresAt: number;
}

const TOKEN_KEY = 'scheduler.token';
const REFRESH_LOCK = 'scheduler.auth-refresh';
const RENEW_LEEWAY_MS = 60_000;
const MIN_RENEW_DELAY_MS = 5_000;
const RENEW_RETRY_DELAYS_MS = [5_000, 15_000, 30_000];
const MAX_TIMER_MS = 2_147_483_647;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

function isExpired(session: Session): boolean {
  return session.expiresAt <= Date.now();
}

function decodeSession(token: string | null): Session | null {
  if (!token) return null;
  try {
    const payload = jwtDecode<TokenPayload>(token);
    const roles = (payload.roles ?? []).filter(isRole);
    if (!roles.length || !payload.username) return null;
    const session: Session = {
      token,
      userId: Number(payload.sub),
      roles,
      clinicId: Number(payload.clinicId),
      clinicName: payload.clinicName,
      clinicSlug: payload.clinicSlug,
      username: payload.username,
      country: payload.country,
      timezone: payload.timezone,
      defaultLanguage: payload.defaultLanguage,
      expiresAt: payload.exp * 1000,
    };
    return isExpired(session) ? null : session;
  } catch {
    return null;
  }
}

class SessionClosedError extends Error {
  constructor() {
    super('Session closed during refresh');
  }
}

function isRefreshRejected(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  private readonly _session = signal<Session | null>(decodeSession(readStorage(TOKEN_KEY)));
  private renewTimer: ReturnType<typeof setTimeout> | undefined;
  private refreshInFlight: Promise<Session> | undefined;
  private renewFailures = 0;
  private sessionEpoch = 0;
  private startupRestorePending = true;

  readonly session = this._session.asReadonly();
  readonly roles = computed<readonly Role[]>(() => this._session()?.roles ?? []);
  readonly restrictedToOwnData = computed(
    () => this.hasRole('DOCTOR') && !this.hasRole('ADMINISTRATOR'),
  );
  readonly userId = computed(() => this._session()?.userId ?? null);

  private readonly me = rxResource({
    params: () => this.userId() ?? undefined,
    stream: () => this.authApi.me(),
  });
  readonly profile = computed(() => (this.me.hasValue() ? this.me.value() : undefined));
  readonly profileLoading = this.me.isLoading;
  readonly profileError = this.me.error;
  readonly displayName = computed(
    () => this.profile()?.name ?? this._session()?.username.split('@')[0] ?? '',
  );

  readonly clinic = computed(() => {
    const session = this._session();
    return session ? { name: session.clinicName, slug: session.clinicSlug } : null;
  });

  readonly regionalSettings = computed<ClinicRegionalSettings | null>(() => {
    const session = this._session();
    if (!session?.country || !session.timezone || !session.defaultLanguage) return null;
    return {
      country: session.country,
      timezone: session.timezone,
      defaultLanguage: session.defaultLanguage,
    };
  });

  constructor() {
    this.scheduleRenewal(this._session());

    const onStorage = (event: StorageEvent) => this.onStorage(event);
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('storage', onStorage);
      clearTimeout(this.renewTimer);
    });
  }

  setProfile(profile: Staff): void {
    this.me.set(profile);
  }

  reloadProfile(): void {
    this.me.reload();
  }

  token(): string | null {
    return this._session()?.token ?? null;
  }

  isAuthenticated(): boolean {
    const session = this._session();
    return !!session && !isExpired(session);
  }

  hasRole(...roles: Role[]): boolean {
    const current = this.roles();
    return roles.some((role) => current.includes(role));
  }

  login(username: string, password: string): Observable<Session> {
    return this.authApi
      .login({ username, password })
      .pipe(map(({ token }) => this.replaceToken(token)));
  }

  replaceToken(token: string): Session {
    const session = decodeSession(token);
    if (!session) throw new Error('Invalid token');
    writeStorage(TOKEN_KEY, session.token);
    this.setSession(session);
    return session;
  }

  refresh(staleToken: string | null = this.token()): Observable<Session> {
    return this.requestRefresh(staleToken).pipe(
      catchError((error: unknown) => {
        if (isRefreshRejected(error) && this._session()) this.closeSession();
        return throwError(() => error);
      }),
    );
  }

  ensureSession(): Observable<boolean> {
    if (this.isAuthenticated()) return of(true);
    const hadStoredToken = readStorage(TOKEN_KEY) !== null;
    if (!this.startupRestorePending && !hadStoredToken) return of(false);
    this.startupRestorePending = false;
    return this.requestRefresh(this.token()).pipe(
      map(() => true),
      catchError((error: unknown) => {
        if (isRefreshRejected(error)) this.clearSession();
        return of(false);
      }),
    );
  }

  logout(extras: NavigationExtras = {}): void {
    this.authApi
      .logout()
      .pipe(catchError(() => EMPTY))
      .subscribe();
    this.closeSession(extras);
  }

  expireSession(token: string): void {
    if (this._session()?.token !== token) return;
    this.clearSession();
  }

  private closeSession(extras: NavigationExtras = {}): void {
    this.clearSession();
    this.router.navigate(['/login'], extras).finally();
  }

  private requestRefresh(staleToken: string | null): Observable<Session> {
    if (!this.refreshInFlight) {
      const epoch = this.sessionEpoch;
      const attempt: Promise<Session> = this.runExclusively(() =>
        this.renewSession(staleToken, epoch),
      ).finally(() => {
        if (this.refreshInFlight === attempt) this.refreshInFlight = undefined;
      });
      this.refreshInFlight = attempt;
    }
    return from(this.refreshInFlight);
  }

  private runExclusively<T>(task: () => Promise<T>): Promise<T> {
    const locks: LockManager | undefined = navigator.locks;
    return locks ? locks.request(REFRESH_LOCK, task) : task();
  }

  private async renewSession(staleToken: string | null, epoch: number): Promise<Session> {
    this.assertSessionEpoch(epoch);
    const stored = decodeSession(readStorage(TOKEN_KEY));
    if (stored && stored.token !== staleToken && stored.expiresAt - Date.now() > RENEW_LEEWAY_MS) {
      this.setSession(stored);
      return stored;
    }
    const { token } = await firstValueFrom(this.authApi.refresh());
    this.assertSessionEpoch(epoch);
    return this.replaceToken(token);
  }

  private assertSessionEpoch(epoch: number): void {
    if (epoch !== this.sessionEpoch) throw new SessionClosedError();
  }

  private setSession(session: Session | null): void {
    this._session.set(session);
    this.scheduleRenewal(session);
  }

  private clearSession(): void {
    this.sessionEpoch++;
    this.refreshInFlight = undefined;
    this.startupRestorePending = false;
    writeStorage(TOKEN_KEY, null);
    this.setSession(null);
  }

  private scheduleRenewal(session: Session | null): void {
    this.renewFailures = 0;
    clearTimeout(this.renewTimer);
    this.renewTimer = undefined;
    if (!session) return;
    this.armRenewal(
      session,
      Math.max(session.expiresAt - RENEW_LEEWAY_MS - Date.now(), MIN_RENEW_DELAY_MS),
    );
  }

  private armRenewal(session: Session, delay: number): void {
    clearTimeout(this.renewTimer);
    this.renewTimer = this.zone.runOutsideAngular(() =>
      setTimeout(() => this.zone.run(() => this.renewDue(session)), Math.min(delay, MAX_TIMER_MS)),
    );
  }

  private renewDue(session: Session): void {
    if (this._session()?.token !== session.token) return;
    const remaining = session.expiresAt - RENEW_LEEWAY_MS - Date.now();
    if (remaining > MIN_RENEW_DELAY_MS) {
      this.armRenewal(session, remaining);
      return;
    }
    this.refresh(session.token).subscribe({
      error: (error: unknown) => this.retryRenewal(session, error),
    });
  }

  private retryRenewal(session: Session, error: unknown): void {
    const untilExpiry = session.expiresAt - Date.now();
    if (isRefreshRejected(error) || untilExpiry <= 0) return;
    const delays = RENEW_RETRY_DELAYS_MS;
    const delay = delays[Math.min(this.renewFailures, delays.length - 1)];
    this.renewFailures++;
    this.armRenewal(session, Math.min(delay, untilExpiry));
  }

  private onStorage(event: StorageEvent): void {
    if (event.key !== TOKEN_KEY && event.key !== null) return;
    const current = this._session();
    const next = decodeSession(readStorage(TOKEN_KEY));
    if (current?.token === next?.token) return;

    const access = this.currentSessionAccess();
    if (next && current && access === 'required') {
      const sameUser = current.userId === next.userId && current.clinicId === next.clinicId;
      if (!sameUser) {
        location.assign(HOME_URL);
        return;
      }
    }
    this.setSession(next);
    if (next && access === 'guestOnly') this.router.navigateByUrl(HOME_URL).finally();
  }

  private currentSessionAccess(): SessionAccess | null {
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let access: SessionAccess | null = null;
    while (route) {
      access = (route.data[SESSION_ACCESS] as SessionAccess | undefined) ?? access;
      route = route.firstChild;
    }
    return access;
  }
}
