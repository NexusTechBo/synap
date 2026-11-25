import { HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { WhatsappApi } from '../../../../../../app/core/api/whatsapp.api';
import {
  WhatsappPairingCodeResponse,
  WhatsappSessionStatus,
  WhatsappSessionStatusResponse,
} from '../../../../../../app/core/models/api.models';
import { WhatsappQrService } from '../../../../../../app/features/profile/components/whatsapp-qr/whatsapp-qr.service';
import { NotificationService } from '../../../../../../app/shared/services/notification.service';

describe('WhatsappQrService', () => {
  let current: WhatsappSessionStatusResponse;
  let api: {
    status: ReturnType<typeof vi.fn>;
    qr: ReturnType<typeof vi.fn>;
    pairingCode: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  function session(
    status: WhatsappSessionStatus,
    overrides: Partial<WhatsappSessionStatusResponse> = {},
  ): WhatsappSessionStatusResponse {
    return {
      id: 'wa-1',
      status,
      clinicPhoneNumber: '+59171234567',
      linkedPhoneNumber: null,
      ...overrides,
    };
  }

  function stubPointerCoarse(coarse: boolean): void {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: coarse && query === '(pointer: coarse)' })),
    );
  }

  function create(): WhatsappQrService {
    TestBed.configureTestingModule({
      providers: [WhatsappQrService, { provide: WhatsappApi, useValue: api }],
    });
    return TestBed.inject(WhatsappQrService);
  }

  async function flush(ms = 0): Promise<void> {
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(ms);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
  }

  function pairingResponse(code: string): Observable<WhatsappPairingCodeResponse> {
    return of({ status: 'PAIRING_PENDING', code });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    stubPointerCoarse(false);
    current = session('PAIRING_PENDING');
    api = {
      status: vi.fn(() => of(current)),
      qr: vi.fn(() => of(new HttpResponse<Blob>({ status: 204 }))),
      pairingCode: vi.fn(() => pairingResponse('ABCD-1234')),
      logout: vi.fn(() => of(undefined)),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('method selection', () => {
    it('defaults to qr when the pointer is not coarse', async () => {
      const service = create();
      await flush();

      expect(service.method()).toBe('qr');
    });

    it('defaults to code when the pointer is coarse and a clinic phone exists', async () => {
      stubPointerCoarse(true);
      const service = create();
      await flush();

      expect(service.canUseCode()).toBe(true);
      expect(service.method()).toBe('code');
    });

    it('forces qr when the clinic phone number is null even if code is preferred', async () => {
      stubPointerCoarse(true);
      current = session('PAIRING_PENDING', { clinicPhoneNumber: null });
      const service = create();
      await flush();

      expect(service.canUseCode()).toBe(false);
      expect(service.method()).toBe('qr');
      expect(api.pairingCode).not.toHaveBeenCalled();
    });

    it('switches the method with selectMethod', async () => {
      const service = create();
      await flush();

      service.selectMethod('code');

      expect(service.method()).toBe('code');
    });
  });

  describe('code mode', () => {
    beforeEach(() => stubPointerCoarse(true));

    it('requests the pairing code once and exposes it while linking', async () => {
      const service = create();
      await flush();
      await flush(9_000);

      expect(service.view()).toBe('linking');
      expect(service.pairingCode()).toBe('ABCD-1234');
      expect(api.pairingCode).toHaveBeenCalledTimes(1);
      expect(api.qr).not.toHaveBeenCalled();
    });

    it('treats PAIRING_PENDING as linking', async () => {
      const service = create();
      await flush();

      expect(service.status()).toBe('PAIRING_PENDING');
      expect(service.view()).toBe('linking');
    });

    it('becomes connected and notifies success when the status turns READY', async () => {
      const service = create();
      await flush();

      current = session('READY', { linkedPhoneNumber: '+59171234567' });
      await flush(3_000);

      const messages = TestBed.inject(NotificationService)
        .notifications()
        .map((n) => n.message);
      expect(service.view()).toBe('connected');
      expect(messages).toEqual(['WhatsApp vinculado correctamente']);
    });

    it('expires when the status goes from PAIRING_PENDING to IDLE after the code arrived', async () => {
      const service = create();
      await flush();
      expect(service.pairingCode()).toBe('ABCD-1234');

      current = session('IDLE');
      await flush(3_000);

      expect(service.view()).toBe('expired');
    });

    it('does not expire on IDLE when the user switched to qr', async () => {
      const service = create();
      await flush();
      service.selectMethod('qr');
      await flush();

      current = session('IDLE');
      await flush(3_000);

      expect(service.view()).toBe('linking');
    });

    it('does not expire on IDLE when the code has not arrived yet', async () => {
      api.pairingCode.mockReturnValue(new Subject<WhatsappPairingCodeResponse>());
      const service = create();
      await flush();
      expect(service.pairingCode()).toBeNull();

      current = session('IDLE');
      await flush(3_000);

      expect(service.view()).toBe('linking');
    });

    it('expires after 160 seconds', async () => {
      const service = create();
      await flush();

      await flush(159_000);
      expect(service.view()).toBe('linking');

      await flush(1_000);
      expect(service.view()).toBe('expired');
    });

    it('shows the error view when the pairing code request fails', async () => {
      api.pairingCode.mockReturnValue(throwError(() => new Error('boom')));
      const service = create();
      await flush();

      expect(service.view()).toBe('error');
      expect(service.error()).toBe('No se pudo generar el código de vinculación');
    });

    it('useQr switches to qr and restarts the session', async () => {
      api.pairingCode.mockReturnValue(throwError(() => new Error('boom')));
      const service = create();
      await flush();
      api.status.mockClear();

      service.useQr();
      await flush();

      expect(service.method()).toBe('qr');
      expect(service.error()).toBeNull();
      expect(api.status).toHaveBeenCalledTimes(1);
      expect(api.qr).toHaveBeenCalledTimes(1);
    });
  });

  describe('qr mode', () => {
    it('requests the qr and not the pairing code while linking', async () => {
      const service = create();
      await flush();

      expect(service.view()).toBe('linking');
      expect(api.qr).toHaveBeenCalledTimes(1);
      expect(api.pairingCode).not.toHaveBeenCalled();
    });

    it('refreshes the qr every 20 seconds, six times, then expires', async () => {
      const service = create();
      await flush();

      await flush(100_000);
      expect(api.qr).toHaveBeenCalledTimes(6);
      expect(service.view()).toBe('linking');

      await flush(20_000);
      expect(service.view()).toBe('expired');
    });
  });

  describe('statusLabel', () => {
    it('shows the QR label for PAIRING_PENDING when the method is qr', async () => {
      const service = create();
      await flush();

      expect(service.statusLabel()).toBe('Esperando escaneo');
    });

    it('shows the code label for QR_PENDING when the method is code', async () => {
      stubPointerCoarse(true);
      current = session('QR_PENDING');
      const service = create();
      await flush();

      expect(service.statusLabel()).toBe('Esperando código');
    });

    it('updates the label when the method changes without a new backend response', async () => {
      const service = create();
      await flush();
      expect(service.statusLabel()).toBe('Esperando escaneo');
      const calls = api.status.mock.calls.length;

      service.selectMethod('code');
      expect(service.statusLabel()).toBe('Esperando código');

      service.selectMethod('qr');
      expect(service.statusLabel()).toBe('Esperando escaneo');
      expect(api.status.mock.calls.length).toBe(calls);
    });

    it('keeps the READY label unchanged', async () => {
      stubPointerCoarse(true);
      current = session('READY');
      const service = create();
      await flush();

      expect(service.statusLabel()).toBe('Conectado');
    });

    it('keeps the IDLE label unchanged', async () => {
      stubPointerCoarse(true);
      current = session('IDLE');
      const service = create();
      await flush();

      expect(service.statusLabel()).toBe('Sin vincular');
    });

    it('is empty before the first status arrives', () => {
      api.status.mockReturnValue(new Subject<WhatsappSessionStatusResponse>());
      const service = create();

      expect(service.statusLabel()).toBe('');
    });
  });

  describe('phoneMismatch', () => {
    async function mismatch(clinic: string | null, linked: string | null): Promise<boolean> {
      current = session('READY', { clinicPhoneNumber: clinic, linkedPhoneNumber: linked });
      const service = create();
      await flush();
      return service.phoneMismatch();
    }

    it('is false when the numbers match ignoring formatting', async () => {
      expect(await mismatch('+591 7123-4567', '59171234567')).toBe(false);
    });

    it('is true when the numbers differ', async () => {
      expect(await mismatch('+59171234567', '+59176543210')).toBe(true);
    });

    it('is false when the linked number is null', async () => {
      expect(await mismatch('+59171234567', null)).toBe(false);
    });

    it('is false when the clinic number is null', async () => {
      expect(await mismatch(null, '+59171234567')).toBe(false);
    });

    it('is false when the status is not READY', async () => {
      current = session('PAIRING_PENDING', { linkedPhoneNumber: '+59176543210' });
      const service = create();
      await flush();

      expect(service.phoneMismatch()).toBe(false);
    });

    it('treats a Brazilian number with the ninth digit as equal to the one without it', async () => {
      expect(await mismatch('+5511987654321', '551187654321')).toBe(false);
    });

    it('treats a Brazilian number without the ninth digit as equal to the one with it', async () => {
      expect(await mismatch('+551187654321', '+5511987654321')).toBe(false);
    });

    it('detects a different Brazilian number', async () => {
      expect(await mismatch('+5511987654321', '+5511987650000')).toBe(true);
    });
  });
});
