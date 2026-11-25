import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { StaffApi } from '../../../../app/core/api/staff.api';
import { WhatsappApi } from '../../../../app/core/api/whatsapp.api';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { DoctorsStore } from '../../../../app/core/catalogs/doctors.store';
import { SpecialtiesStore } from '../../../../app/core/catalogs/specialties.store';
import { API_ERROR_CODES } from '../../../../app/core/http/api-error';
import { WhatsappSessionStatus } from '../../../../app/core/models/api.models';
import { DoctorModeAppointmentsDialogComponent } from '../../../../app/features/profile/components/doctor-mode-appointments-dialog/doctor-mode-appointments-dialog.component';
import { ProfileService } from '../../../../app/features/profile/profile.service';
import { ConfirmService } from '../../../../app/shared/services/confirm.service';
import { NotificationService } from '../../../../app/shared/services/notification.service';

function conflict(count: number): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 409,
    error: {
      status: 409,
      message: 'Citas activas',
      code: API_ERROR_CODES.doctorModeActiveAppointmentsConflict,
      details: { count },
    },
  });
}

describe('ProfileService', () => {
  let service: ProfileService;
  let staffApi: {
    updateDoctorMode: ReturnType<typeof vi.fn>;
  };
  let whatsappApi: { status: ReturnType<typeof vi.fn> };
  let adminRole: ReturnType<typeof signal<boolean>>;
  let auth: {
    profile: ReturnType<typeof signal>;
    profileLoading: ReturnType<typeof signal>;
    profileError: ReturnType<typeof signal>;
    hasRole: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    reloadProfile: ReturnType<typeof vi.fn>;
    setProfile: ReturnType<typeof vi.fn>;
  };
  let confirm: { ask: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let dialogClosed: Subject<unknown>;
  let notifications: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let doctorsStore: { invalidate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    staffApi = {
      updateDoctorMode: vi.fn(() => of(undefined)),
    };
    whatsappApi = { status: vi.fn(() => of({ status: 'IDLE' })) };
    adminRole = signal(false);
    auth = {
      profile: signal(null),
      profileLoading: signal(false),
      profileError: signal(null),
      hasRole: vi.fn(() => adminRole()),
      refresh: vi.fn(() => of(null)),
      reloadProfile: vi.fn(),
      setProfile: vi.fn(),
    };
    confirm = { ask: vi.fn(() => of(true)) };
    dialogClosed = new Subject();
    dialog = { open: vi.fn(() => ({ closed: dialogClosed })) };
    notifications = { success: vi.fn(), error: vi.fn() };
    doctorsStore = { invalidate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        { provide: StaffApi, useValue: staffApi },
        { provide: WhatsappApi, useValue: whatsappApi },
        { provide: AuthService, useValue: auth },
        { provide: ConfirmService, useValue: confirm },
        { provide: Dialog, useValue: dialog },
        { provide: NotificationService, useValue: notifications },
        { provide: DoctorsStore, useValue: doctorsStore },
        {
          provide: SpecialtiesStore,
          useValue: {
            specialties: signal([]),
            isLoading: signal(false),
            errorMessage: signal(null),
            load: vi.fn(),
            reload: vi.fn(),
          },
        },
      ],
    });
    service = TestBed.inject(ProfileService);
  });

  function run(): { completed: boolean } {
    const state = { completed: false };
    service.disableDoctorMode().subscribe({ complete: () => (state.completed = true) });
    return state;
  }

  describe('disableDoctorMode', () => {
    it('does nothing when the initial confirmation is declined', () => {
      confirm.ask.mockReturnValue(of(false));
      const state = run();
      expect(staffApi.updateDoctorMode).not.toHaveBeenCalled();
      expect(state.completed).toBe(true);
    });

    it('asks with a text that keeps the availabilities', () => {
      run();
      const options = confirm.ask.mock.calls[0][0] as { message: string };
      expect(options.message).toContain('se conservan');
      expect(options.message).not.toContain('desactivar tus horarios');
    });

    it('turns it off with a single call when there is no conflict', () => {
      run();
      expect(staffApi.updateDoctorMode).toHaveBeenCalledOnce();
      expect(staffApi.updateDoctorMode).toHaveBeenCalledWith({
        enabled: false,
        specialtyId: null,
      });
      expect(dialog.open).not.toHaveBeenCalled();
      expect(auth.refresh).toHaveBeenCalled();
      expect(auth.reloadProfile).toHaveBeenCalledOnce();
      expect(doctorsStore.invalidate).toHaveBeenCalledOnce();
      expect(notifications.success).toHaveBeenCalledWith('Ya no atiendes como doctor');
    });

    it('opens the dialog on conflict and resends cancelling the appointments with the reason', () => {
      staffApi.updateDoctorMode
        .mockReturnValueOnce(throwError(() => conflict(3)))
        .mockReturnValueOnce(of(undefined));
      const state = run();

      expect(dialog.open).toHaveBeenCalledWith(
        DoctorModeAppointmentsDialogComponent,
        expect.objectContaining({
          data: { count: 3 },
          ariaLabelledBy: expect.stringMatching(/-title$/),
        }),
      );
      expect(staffApi.updateDoctorMode).toHaveBeenCalledOnce();

      dialogClosed.next({ reason: 'Vacaciones' });
      dialogClosed.complete();

      expect(staffApi.updateDoctorMode).toHaveBeenCalledTimes(2);
      expect(staffApi.updateDoctorMode).toHaveBeenLastCalledWith({
        enabled: false,
        specialtyId: null,
        cancelAppointments: true,
        cancellationReason: 'Vacaciones',
      });
      expect(auth.refresh).toHaveBeenCalled();
      expect(notifications.success).toHaveBeenCalledWith(
        'Ya no atiendes como doctor. Se cancelaron las citas y se notificó a los pacientes',
      );
      expect(state.completed).toBe(true);
    });

    it('omits the reason when blank and uses the singular message for one appointment', () => {
      staffApi.updateDoctorMode
        .mockReturnValueOnce(throwError(() => conflict(1)))
        .mockReturnValueOnce(of(undefined));
      run();
      dialogClosed.next({ reason: '' });
      dialogClosed.complete();

      expect(staffApi.updateDoctorMode).toHaveBeenLastCalledWith({
        enabled: false,
        specialtyId: null,
        cancelAppointments: true,
      });
      expect(notifications.success).toHaveBeenCalledWith(
        'Ya no atiendes como doctor. Se canceló la cita y se notificó al paciente',
      );
    });

    it('does nothing more when the dialog is dismissed', () => {
      staffApi.updateDoctorMode.mockReturnValueOnce(throwError(() => conflict(2)));
      const state = run();
      dialogClosed.next(undefined);
      dialogClosed.complete();

      expect(staffApi.updateDoctorMode).toHaveBeenCalledOnce();
      expect(auth.refresh).not.toHaveBeenCalled();
      expect(auth.reloadProfile).not.toHaveBeenCalled();
      expect(notifications.success).not.toHaveBeenCalled();
      expect(notifications.error).not.toHaveBeenCalled();
      expect(state.completed).toBe(true);
    });

    it('notifies other errors without opening the dialog', () => {
      staffApi.updateDoctorMode.mockReturnValueOnce(throwError(() => new Error('x')));
      const state = run();
      expect(dialog.open).not.toHaveBeenCalled();
      expect(notifications.error).toHaveBeenCalledWith('No se pudo desactivar el modo doctor');
      expect(state.completed).toBe(true);
    });

    it('notifies an error of the second call', () => {
      staffApi.updateDoctorMode
        .mockReturnValueOnce(throwError(() => conflict(2)))
        .mockReturnValueOnce(
          throwError(
            () =>
              new HttpErrorResponse({
                status: 500,
                error: { message: 'Falló' },
              }),
          ),
        );
      run();
      dialogClosed.next({ reason: '' });
      dialogClosed.complete();
      expect(notifications.error).toHaveBeenCalledWith('Falló');
      expect(auth.refresh).not.toHaveBeenCalled();
    });
  });

  describe('session refresh after profile changes', () => {
    it('keeps the doctor mode change successful when the refresh fails', () => {
      auth.refresh.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
      let completed = false;
      let failed = false;

      service.enableDoctorMode(3).subscribe({
        complete: () => (completed = true),
        error: () => (failed = true),
      });

      expect(staffApi.updateDoctorMode).toHaveBeenCalledWith({
        enabled: true,
        specialtyId: 3,
      });
      expect(failed).toBe(false);
      expect(completed).toBe(true);
      expect(auth.reloadProfile).toHaveBeenCalledOnce();
      expect(doctorsStore.invalidate).toHaveBeenCalledOnce();
    });

    it('refreshes the session after updating the own profile', () => {
      const profile = { id: 1, name: 'Ana' };
      (staffApi as Record<string, unknown>)['updateSelf'] = vi.fn(() => of(profile));
      let result: unknown;

      service.update({} as never).subscribe((value) => (result = value));

      expect(result).toBe(profile);
      expect(auth.refresh).toHaveBeenCalledOnce();
    });

    it('returns the updated profile when the refresh fails after updating', () => {
      const profile = { id: 1, name: 'Ana' };
      (staffApi as Record<string, unknown>)['updateSelf'] = vi.fn(() => of(profile));
      auth.refresh.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      let result: unknown;

      service.update({} as never).subscribe((value) => (result = value));

      expect(result).toBe(profile);
    });

    function updateAsAdmin(
      phoneNumber: string | null | undefined,
      statuses: (WhatsappSessionStatus | Error)[],
    ): void {
      adminRole.set(true);
      auth.profile.set({ id: 1, name: 'Admin', phoneNumber: '+59170000001' });
      (staffApi as Record<string, unknown>)['updateSelf'] = vi.fn(() =>
        of({ id: 1, name: 'Admin', phoneNumber }),
      );
      const queue = [...statuses];
      whatsappApi.status.mockImplementation(() => {
        const next = queue.shift()!;
        return next instanceof Error ? throwError(() => next) : of({ status: next });
      });
      service.update({ phoneNumber } as never).subscribe();
    }

    it('flags the relink alert when the session goes from active to inactive', () => {
      updateAsAdmin('+59171234567', ['READY', 'IDLE']);

      expect(whatsappApi.status).toHaveBeenCalledTimes(2);
      expect(service.whatsappRelinkNeeded()).toBe(true);
      expect(notifications.success).toHaveBeenCalledTimes(1);

      service.clearWhatsappRelinkNotice();
      expect(service.whatsappRelinkNeeded()).toBe(false);
    });

    it('does not flag the alert when the session stays active', () => {
      updateAsAdmin('+59171234567', ['READY', 'READY']);

      expect(service.whatsappRelinkNeeded()).toBe(false);
    });

    it.each<WhatsappSessionStatus>(['IDLE', 'DISCONNECTED'])(
      'does not query again nor flag when the session was %s before',
      (status) => {
        updateAsAdmin('+59171234567', [status]);

        expect(whatsappApi.status).toHaveBeenCalledOnce();
        expect(service.whatsappRelinkNeeded()).toBe(false);
      },
    );

    it('does not flag the alert when the status check fails after saving', () => {
      updateAsAdmin('+59171234567', ['READY', new Error('boom')]);

      expect(service.whatsappRelinkNeeded()).toBe(false);
    });

    it('still saves the profile when the status check fails before saving', () => {
      updateAsAdmin('+59171234567', [new Error('boom')]);

      expect(whatsappApi.status).toHaveBeenCalledOnce();
      expect(auth.setProfile).toHaveBeenCalledOnce();
      expect(notifications.success).toHaveBeenCalledOnce();
      expect(service.whatsappRelinkNeeded()).toBe(false);
    });

    it('does not query status again nor flag the alert when the update fails', () => {
      adminRole.set(true);
      auth.profile.set({ id: 1, name: 'Admin', phoneNumber: '+59170000001' });
      (staffApi as Record<string, unknown>)['updateSelf'] = vi.fn(() =>
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      whatsappApi.status.mockReturnValue(of({ status: 'READY' }));
      const errors: unknown[] = [];

      service
        .update({ phoneNumber: '+59171234567' } as never)
        .subscribe({ error: (error) => errors.push(error) });

      expect(errors).toHaveLength(1);
      expect(whatsappApi.status).toHaveBeenCalledOnce();
      expect(service.whatsappRelinkNeeded()).toBe(false);
      expect(notifications.success).not.toHaveBeenCalled();
      expect(auth.refresh).not.toHaveBeenCalled();
    });

    it('keeps the toast and refreshes the session when the status check fails after saving', () => {
      updateAsAdmin('+59171234567', ['READY', new Error('boom')]);

      expect(notifications.success).toHaveBeenCalledOnce();
      expect(auth.refresh).toHaveBeenCalledOnce();
    });

    it('keeps the toast and refreshes the session when the status check fails before saving', () => {
      updateAsAdmin('+59171234567', [new Error('boom')]);

      expect(notifications.success).toHaveBeenCalledOnce();
      expect(auth.refresh).toHaveBeenCalledOnce();
    });

    it('keeps the toast and the alert when the refresh fails after the relink was flagged', () => {
      auth.refresh.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

      updateAsAdmin('+59171234567', ['READY', 'IDLE']);

      expect(service.whatsappRelinkNeeded()).toBe(true);
      expect(notifications.success).toHaveBeenCalledOnce();
    });

    it('does not query WhatsApp when the administrator phone does not change', () => {
      updateAsAdmin('+59170000001', []);

      expect(whatsappApi.status).not.toHaveBeenCalled();
      expect(service.whatsappRelinkNeeded()).toBe(false);
    });

    it('does not query WhatsApp when the phone is not part of the request', () => {
      updateAsAdmin(undefined, []);

      expect(whatsappApi.status).not.toHaveBeenCalled();
    });

    it('does not query WhatsApp when a non administrator changes the phone', () => {
      auth.profile.set({ id: 1, name: 'Ana', phoneNumber: '+59170000001' });
      (staffApi as Record<string, unknown>)['updateSelf'] = vi.fn(() => of({ id: 1 }));

      service.update({ phoneNumber: '+59171234567' } as never).subscribe();

      expect(whatsappApi.status).not.toHaveBeenCalled();
      expect(service.whatsappRelinkNeeded()).toBe(false);
    });
  });
});
