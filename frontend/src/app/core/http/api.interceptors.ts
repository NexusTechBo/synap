import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpStatusCode,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { GuestSessionService } from '../auth/guest-session.service';
import { I18nService } from '../i18n/i18n.service';

const GUEST_PATH = 'guest/';
const PUBLIC_PATHS = [
  'public/',
  'auth/login',
  'auth/refresh',
  'auth/logout',
  'clinics/activate',
  'clinics/activation/resend',
];
const REGISTER_PATH = 'clinics';

export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (/^(https?:)?\/\//.test(req.url) || req.url.startsWith('/')) return next(req);
  return next(req.clone({ url: environment.apiUrl + req.url }));
};

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const lang = inject(I18nService).currentLang();
  return next(req.clone({ setHeaders: { 'Accept-Language': lang } }));
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPublicRequest(req)) return next(req);
  if (isGuestRequest(req.url)) return guestRequest(req, next);

  const auth = inject(AuthService);
  const token = auth.token();
  if (token && !auth.isAuthenticated()) {
    return auth
      .refresh(token)
      .pipe(switchMap((session) => sendRetried(req, next, auth, session.token)));
  }
  return next(withToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (!token || !isUnauthorized(error)) return throwError(() => error);
      return auth.refresh(token).pipe(
        catchError(() => throwError(() => error)),
        switchMap((session) => sendRetried(req, next, auth, session.token)),
      );
    }),
  );
};

function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized;
}

function sendRetried(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  token: string,
): Observable<HttpEvent<unknown>> {
  return next(withToken(req, token)).pipe(
    catchError((error: unknown) => {
      if (isUnauthorized(error)) auth.expireSession(token);
      return throwError(() => error);
    }),
  );
}

function hasPath(url: string, path: string): boolean {
  return url.startsWith(path) || url.startsWith(environment.apiUrl + path);
}

function isPublicRequest(req: HttpRequest<unknown>): boolean {
  const path = req.url.startsWith(environment.apiUrl)
    ? req.url.slice(environment.apiUrl.length)
    : req.url;
  if (req.method === 'POST' && path === REGISTER_PATH) return true;
  return PUBLIC_PATHS.some((publicPath) => hasPath(req.url, publicPath));
}

function isGuestRequest(url: string): boolean {
  return hasPath(url, GUEST_PATH);
}

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

function guestRequest(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const guest = inject(GuestSessionService);
  const send = () => guest.ensureToken().pipe(switchMap((token) => next(withToken(req, token))));
  return send().pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== HttpStatusCode.Unauthorized) return throwError(() => error);
      guest.clear();
      return send().pipe(
        catchError((retryError: unknown) => {
          if (retryError instanceof HttpErrorResponse && retryError.status === 401)
            guest.fail(retryError);
          return throwError(() => retryError);
        }),
      );
    }),
  );
}
