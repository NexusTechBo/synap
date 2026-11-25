import { Clipboard } from '@angular/cdk/clipboard';
import { DialogRef } from '@angular/cdk/dialog';
import { HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { WhatsappApi } from '../../../../../../app/core/api/whatsapp.api';
import {
  WhatsappPairingCodeResponse,
  WhatsappSessionStatus,
  WhatsappSessionStatusResponse,
} from '../../../../../../app/core/models/api.models';
import { WhatsappQrComponent } from '../../../../../../app/features/profile/components/whatsapp-qr/whatsapp-qr.component';
import { NotificationService } from '../../../../../../app/shared/services/notification.service';

describe('WhatsappQrComponent', () => {
  let fixture: ComponentFixture<WhatsappQrComponent>;
  let element: HTMLElement;
  let current: WhatsappSessionStatusResponse;
  let clipboard: { copy: ReturnType<typeof vi.fn> };
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

  async function refresh(ms = 0): Promise<void> {
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();
  }

  async function render(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [WhatsappQrComponent],
      providers: [
        { provide: WhatsappApi, useValue: api },
        { provide: Clipboard, useValue: clipboard },
        { provide: DialogRef, useValue: { id: 'whatsapp-dialog', close: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(WhatsappQrComponent);
    element = fixture.nativeElement;
    await refresh();
  }

  function radios(): HTMLInputElement[] {
    return Array.from(element.querySelectorAll('input[type="radio"]'));
  }

  function button(text: string): HTMLButtonElement | undefined {
    return Array.from(element.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    );
  }

  function pairing(code: string): Observable<WhatsappPairingCodeResponse> {
    return of({ status: 'PAIRING_PENDING', code });
  }

  function notifications(): string[] {
    return TestBed.inject(NotificationService)
      .notifications()
      .map((n) => `${n.type}:${n.message}`);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    stubPointerCoarse(false);
    current = session('PAIRING_PENDING');
    clipboard = { copy: vi.fn(() => true) };
    api = {
      status: vi.fn(() => of(current)),
      qr: vi.fn(() => of(new HttpResponse<Blob>({ status: 204 }))),
      pairingCode: vi.fn(() => pairing('ABCD-1234')),
      logout: vi.fn(() => of(undefined)),
    };
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('method selector', () => {
    it('shows the QR and Code options when a clinic phone exists', async () => {
      await render();

      expect(radios().map((r) => r.value)).toEqual(['qr', 'code']);
      expect(radios()[0].checked).toBe(true);
    });

    it('hides the selector when there is no clinic phone', async () => {
      current = session('PAIRING_PENDING', { clinicPhoneNumber: null });
      await render();

      expect(radios()).toHaveLength(0);
    });

    it('switches to code, requests the code and renders it', async () => {
      await render();

      radios()[1].dispatchEvent(new Event('change'));
      await refresh();

      expect(api.pairingCode).toHaveBeenCalledTimes(1);
      expect(radios()[1].checked).toBe(true);
      expect(element.textContent).toContain('ABCD-1234');
      expect(element.querySelector('img')).toBeNull();
    });
  });

  describe('copy code', () => {
    beforeEach(() => stubPointerCoarse(true));

    it('copies the code and notifies success', async () => {
      await render();

      button('Copiar')?.click();

      expect(clipboard.copy).toHaveBeenCalledWith('ABCD-1234');
      expect(notifications()).toEqual(['success:Código copiado']);
    });

    it('notifies an error when the clipboard copy fails', async () => {
      clipboard.copy.mockReturnValue(false);
      await render();

      button('Copiar')?.click();

      expect(notifications()).toEqual(['error:No se pudo copiar el código']);
    });
  });

  describe('phone mismatch banner', () => {
    it('is shown when connected with a different linked number', async () => {
      current = session('READY', { linkedPhoneNumber: '+59176543210' });
      await render();

      const alert = element.querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('El número vinculado no es el del espacio de trabajo');
      expect(alert?.textContent).toContain('+59176543210');
      expect(alert?.textContent).toContain('+59171234567');
    });

    it('is hidden when connected with the same number', async () => {
      current = session('READY', { linkedPhoneNumber: '59171234567' });
      await render();

      expect(element.querySelector('[role="alert"]')).toBeNull();
    });

    it('is hidden when the linked number is unknown', async () => {
      current = session('READY');
      await render();

      expect(element.querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('error view', () => {
    it('offers the QR fallback in code mode and restarts with qr when clicked', async () => {
      stubPointerCoarse(true);
      api.pairingCode.mockReturnValue(throwError(() => new Error('boom')));
      await render();

      const useQr = button('Usar código QR');
      expect(useQr).toBeDefined();
      api.status.mockClear();

      useQr?.click();
      await refresh();

      expect(api.status).toHaveBeenCalledTimes(1);
      expect(api.qr).toHaveBeenCalledTimes(1);
      expect(button('Usar código QR')).toBeUndefined();
    });

    it('does not offer the QR fallback in qr mode', async () => {
      api.qr.mockReturnValue(throwError(() => new Error('boom')));
      await render();

      expect(element.textContent).toContain('No se pudo');
      expect(button('Usar código QR')).toBeUndefined();
    });
  });
});
