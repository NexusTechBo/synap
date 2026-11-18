import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LoginRequest, LoginResponse, Staff } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('auth/login', request);
  }

  refresh(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('auth/refresh', null);
  }

  logout(): Observable<void> {
    return this.http.post<void>('auth/logout', null);
  }

  me(): Observable<Staff> {
    return this.http.get<Staff>('auth/me');
  }
}
