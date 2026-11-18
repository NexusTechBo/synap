import { DestroyRef, Injectable, NgZone, computed, effect, inject, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IFrame, IMessage, ReconnectionTimeMode, RxStomp } from '@stomp/rx-stomp';
import { EMPTY, Observable, catchError, defer, filter } from 'rxjs';
import { AuthService } from '../auth/auth.service';

function wsUrl(path: string): string {
  const url = new URL(path, location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

const SESSION_REFRESH = 'SESSION_REFRESH';
const REJECTED_TOKEN_MESSAGES: readonly string[] = ['Stale token', 'Invalid token'];

function isRejectedToken(frame: IFrame): boolean {
  return REJECTED_TOKEN_MESSAGES.includes(frame.headers['message']);
}

function isSessionRefresh(message: IMessage): boolean {
  try {
    return (JSON.parse(message.body) as { type?: unknown }).type === SESSION_REFRESH;
  } catch {
    return false;
  }
}

@Injectable()
export class BoardSocket {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly stomp = new RxStomp();

  readonly connected$: Observable<unknown> = this.stomp.connected$;

  readonly events$: Observable<IMessage> = defer(() =>
    this.stomp.watch({ destination: this.boardTopic() }),
  );

  constructor() {
    const claimsKey = computed(() =>
      JSON.stringify([this.auth.roles(), this.auth.regionalSettings()]),
    );
    let connectionToken: string | null = null;
    let connectionClaims: string | null = null;
    let refreshAttemptedFor: string | null = null;
    this.stomp.configure({
      brokerURL: wsUrl('/ws'),
      beforeConnect: (stomp) => {
        connectionToken = this.auth.token();
        connectionClaims = claimsKey();
        stomp.configure({ connectHeaders: { Authorization: `Bearer ${connectionToken ?? ''}` } });
      },
      heartbeatIncoming: 10_000,
      heartbeatOutgoing: 10_000,
      reconnectDelay: 1_000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30_000,
    });

    this.stomp.stompErrors$.pipe(filter(isRejectedToken), takeUntilDestroyed()).subscribe(() =>
      this.zone.run(() => {
        if (!connectionToken || connectionToken === refreshAttemptedFor) return;
        refreshAttemptedFor = connectionToken;
        this.refreshSession(connectionToken);
      }),
    );

    defer(() => this.stomp.watch({ destination: this.sessionTopic() }))
      .pipe(filter(isSessionRefresh), takeUntilDestroyed())
      .subscribe(() => this.zone.run(() => this.refreshSession(this.auth.token())));

    effect(() => {
      const claims = claimsKey();
      untracked(() => {
        if (connectionClaims !== null && claims !== connectionClaims) {
          this.zone.runOutsideAngular(() => this.stomp.stompClient.forceDisconnect());
        }
      });
    });

    this.zone.runOutsideAngular(() => this.stomp.activate());
    inject(DestroyRef).onDestroy(() => void this.stomp.deactivate());
  }

  isConnected(): boolean {
    return this.stomp.connected();
  }

  private refreshSession(staleToken: string | null): void {
    this.auth
      .refresh(staleToken)
      .pipe(catchError(() => EMPTY))
      .subscribe();
  }

  private sessionTopic(): string {
    return `/topic/clinic/${this.auth.session()?.clinicId}/session`;
  }

  private boardTopic(): string {
    const clinicTopic = `/topic/clinic/${this.auth.session()?.clinicId}`;
    return this.auth.restrictedToOwnData()
      ? `${clinicTopic}/doctor/${this.auth.userId()}/board`
      : `${clinicTopic}/board`;
  }
}
