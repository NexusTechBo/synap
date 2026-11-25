import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WhatsappApi } from '../../../../app/core/api/whatsapp.api';
import { WhatsappPairingCodeResponse } from '../../../../app/core/models/api.models';

describe('WhatsappApi', () => {
  let api: WhatsappApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(WhatsappApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests a pairing code with POST whatsapp/pairing-code and returns it', () => {
    const response: WhatsappPairingCodeResponse = { status: 'PAIRING_PENDING', code: 'ABCD-1234' };
    let result: WhatsappPairingCodeResponse | undefined;

    api.pairingCode().subscribe((value) => (result = value));
    const req = http.expectOne('whatsapp/pairing-code');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(response);

    expect(result).toEqual(response);
  });

  it('propagates the error when the pairing code request fails', () => {
    let status: number | undefined;

    api.pairingCode().subscribe({ error: (e) => (status = e.status) });
    http.expectOne('whatsapp/pairing-code').flush(null, { status: 500, statusText: 'Error' });

    expect(status).toBe(500);
  });
});
