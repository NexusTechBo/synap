import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RxStomp } from '@stomp/rx-stomp';
import { Subject, of, throwError } from 'rxjs';
import { BoardSocket } from '../../../../app/core/api/board.socket';
import { AuthService } from '../../../../app/core/auth/auth.service';

describe('BoardSocket', () => {
  let stomp: RxStomp;
  let beforeConnect: (stomp: RxStomp) => void;
  let configure: ReturnType<typeof vi.spyOn>;
  let watch: ReturnType<typeof vi.spyOn>;
  let forceDisconnect: ReturnType<typeof vi.fn>;
  let topics: Map<string, Subject<unknown>>;
  let roles: ReturnType<typeof signal<string[]>>;
  let regional: ReturnType<typeof signal<unknown>>;
  let currentToken: string | null;
  let refresh: ReturnType<typeof vi.fn>;

  function connectWith(tokenValue: string | null): void {
    currentToken = tokenValue;
    beforeConnect(stomp);
  }

  function rejectToken(message = 'Stale token'): void {
    stomp.stompErrors$.next({ headers: { message } } as never);
  }

  function sessionTopic(): Subject<unknown> {
    return topics.get('/topic/clinic/1/session') as Subject<unknown>;
  }

  beforeEach(() => {
    roles = signal(['ADMINISTRATOR']);
    regional = signal({ country: 'BO', timezone: 'America/La_Paz', defaultLanguage: 'es' });
    currentToken = 'token-1';
    refresh = vi.fn(() => of(null));
    topics = new Map();
    vi.spyOn(RxStomp.prototype, 'activate').mockImplementation(() => undefined);
    vi.spyOn(RxStomp.prototype, 'deactivate').mockResolvedValue(undefined);
    watch = vi.spyOn(RxStomp.prototype, 'watch').mockImplementation(((opts: {
      destination: string;
    }) => {
      if (!topics.has(opts.destination)) topics.set(opts.destination, new Subject<unknown>());
      return topics.get(opts.destination);
    }) as never);
    configure = vi.spyOn(RxStomp.prototype, 'configure');
    TestBed.configureTestingModule({
      providers: [
        BoardSocket,
        {
          provide: AuthService,
          useValue: {
            token: () => currentToken,
            roles,
            regionalSettings: regional,
            session: signal({ clinicId: 1 }),
            restrictedToOwnData: () => false,
            userId: () => 5,
            refresh,
          },
        },
      ],
    });
    TestBed.inject(BoardSocket);
    stomp = configure.mock.contexts[0] as RxStomp;
    beforeConnect = configure.mock.calls[0][0].beforeConnect as (stomp: RxStomp) => void;
    forceDisconnect = vi.spyOn(stomp.stompClient, 'forceDisconnect').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('watches the clinic session topic on creation', () => {
    expect(watch).toHaveBeenCalledWith({ destination: '/topic/clinic/1/session' });
  });

  it('sends the current token as bearer header on every connection attempt', () => {
    connectWith('token-1');

    expect(configure).toHaveBeenLastCalledWith({
      connectHeaders: { Authorization: 'Bearer token-1' },
    });
  });

  describe('rejected token', () => {
    it.each(['Stale token', 'Invalid token'])('refreshes with the stale token on "%s"', (msg) => {
      connectWith('token-1');

      rejectToken(msg);

      expect(refresh).toHaveBeenCalledExactlyOnceWith('token-1');
    });

    it('does not refresh on any other error frame', () => {
      connectWith('token-1');

      rejectToken('Access denied');
      stomp.stompErrors$.next({ headers: {} } as never);

      expect(refresh).not.toHaveBeenCalled();
    });

    it('refreshes only once per token', () => {
      connectWith('token-1');

      rejectToken();
      rejectToken();
      rejectToken('Invalid token');

      expect(refresh).toHaveBeenCalledOnce();
    });

    it('refreshes again when the reconnection used a different token', () => {
      connectWith('token-1');
      rejectToken();
      connectWith('token-2');

      rejectToken();

      expect(refresh).toHaveBeenCalledTimes(2);
      expect(refresh).toHaveBeenLastCalledWith('token-2');
    });

    it('does not refresh without a token', () => {
      connectWith(null);

      rejectToken();

      expect(refresh).not.toHaveBeenCalled();
    });

    it('swallows a failing refresh', () => {
      refresh.mockReturnValue(throwError(() => new Error('down')));
      connectWith('token-1');

      expect(() => rejectToken()).not.toThrow();
    });
  });

  describe('session topic', () => {
    it('refreshes the session on SESSION_REFRESH', () => {
      sessionTopic().next({ body: JSON.stringify({ type: 'SESSION_REFRESH' }) });

      expect(refresh).toHaveBeenCalledExactlyOnceWith('token-1');
    });

    it.each([JSON.stringify({ type: 'OTHER' }), JSON.stringify({}), 'not json', 'null'])(
      'ignores the message %s',
      (body) => {
        sessionTopic().next({ body });

        expect(refresh).not.toHaveBeenCalled();
      },
    );
  });

  describe('reconnection', () => {
    it('reconnects when the roles change', () => {
      connectWith('token-1');

      roles.set(['DOCTOR']);
      TestBed.tick();

      expect(forceDisconnect).toHaveBeenCalledOnce();
    });

    it('reconnects when the regional settings change', () => {
      connectWith('token-1');

      regional.set({ country: 'BR', timezone: 'America/Sao_Paulo', defaultLanguage: 'pt-BR' });
      TestBed.tick();

      expect(forceDisconnect).toHaveBeenCalledOnce();
    });

    it('does not reconnect when only the token changes', () => {
      connectWith('token-1');
      TestBed.tick();

      currentToken = 'token-2';
      roles.set(['ADMINISTRATOR']);
      regional.set({ country: 'BO', timezone: 'America/La_Paz', defaultLanguage: 'es' });
      TestBed.tick();

      expect(forceDisconnect).not.toHaveBeenCalled();
    });

    it('does not reconnect before the first connection', () => {
      roles.set(['DOCTOR']);
      TestBed.tick();

      expect(forceDisconnect).not.toHaveBeenCalled();
    });

    it('does not reconnect again once the new connection already has the new claims', () => {
      connectWith('token-1');
      roles.set(['DOCTOR']);
      TestBed.tick();
      connectWith('token-2');

      TestBed.tick();

      expect(forceDisconnect).toHaveBeenCalledOnce();
    });
  });
});
