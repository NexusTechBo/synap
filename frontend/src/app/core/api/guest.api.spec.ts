import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GuestAppointmentRequest, GuestAppointmentResponse } from '../models/api.models';
import { GuestApi } from './guest.api';

const RESPONSE = { appointmentId: 1 } as GuestAppointmentResponse;

describe('GuestApi', () => {
  let api: GuestApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(GuestApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('book', () => {
    it('posts a returning patient with only the phone to guest/appointments', () => {
      const request: GuestAppointmentRequest = {
        doctorId: 10,
        startTime: '2026-11-12T09:00:00',
        patient: { phoneNumber: '70000000' },
      };

      api.book(request).subscribe();

      const req = http.expectOne('guest/appointments');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      expect(req.request.body.patient).toEqual({ phoneNumber: '70000000' });
      req.flush(RESPONSE);
    });

    it('posts a new patient without CI to guest/appointments/new-patient', () => {
      const request: GuestAppointmentRequest = {
        doctorId: 10,
        startTime: '2026-11-12T09:00:00',
        patient: { document: null, phoneNumber: '70000000', name: 'Ana Rojas', email: null },
      };

      api.book(request).subscribe();

      const req = http.expectOne('guest/appointments/new-patient');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.patient).toEqual({
        document: null,
        phoneNumber: '70000000',
        name: 'Ana Rojas',
        email: null,
      });
      req.flush(RESPONSE);
    });

    it('posts a new patient with CI to guest/appointments/new-patient', () => {
      const request: GuestAppointmentRequest = {
        doctorId: 10,
        startTime: '2026-11-12T09:00:00',
        patient: {
          document: '1234567',
          phoneNumber: '70000000',
          name: 'Ana Rojas',
          email: 'a@b.co',
        },
      };

      api.book(request).subscribe();

      const req = http.expectOne('guest/appointments/new-patient');
      expect(req.request.body.patient.document).toBe('1234567');
      req.flush(RESPONSE);
    });
  });
});
