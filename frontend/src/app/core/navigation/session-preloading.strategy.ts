import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PRELOAD } from './navigation';

const LOGIN_PATH = '/login';

@Injectable({ providedIn: 'root' })
export class SessionPreloadingStrategy implements PreloadingStrategy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return route.data?.[PRELOAD] && this.shouldPreload() ? load() : of(null);
  }

  private shouldPreload(): boolean {
    return this.auth.isAuthenticated() || this.router.url.split(/[?#]/)[0] === LOGIN_PATH;
  }
}
