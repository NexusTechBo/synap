import { Dialog } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { StaffApi } from '../../../../app/core/api/staff.api';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { DoctorsStore } from '../../../../app/core/catalogs/doctors.store';
import { SpecialtiesStore } from '../../../../app/core/catalogs/specialties.store';
import { API_ERROR_CODES } from '../../../../app/core/http/api-error';
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
    auth = {
      profile: signal(null),
      profileLoading: signal(false),
      profileError: signal(null),
      hasRole: vi.fn(() => false),
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

    it('notifies and flags WhatsApp relink when administrator changes own phone number', () => {
      auth.hasRole.mockReturnValue(true);
      auth.profile.set({ id: 1, name: 'Admin', phoneNumber: '+59170000001' });
      const updated = { id: 1, name: 'Admin', phoneNumber: '+59171234567' };
      (staffApi as Record<string, unknown>)['updateSelf'] = vi.fn(() => of(updated));

      service.update({} as never).subscribe();

      expect(service.whatsappRelinkNeeded()).toBe(true);
      expect(notifications.success).toHaveBeenCalledWith('Perfil actualizado');
      expect(notifications.success).toHaveBeenCalledWith(
        'El número del espacio de trabajo se actualizó. Vuelve a vincular WhatsApp con QR o código de 8 dígitos.',
      );

      service.clearWhatsappRelinkNotice();
      expect(service.whatsappRelinkNeeded()).toBe(false);
    });

    it('does not flag WhatsApp relink when administrator phone number does not change', () => {
      auth.hasRole.mockReturnValue(true);
      auth.profile.set({ id: 1, name: 'Admin', phoneNumber: '+59170000001' });
      const updated = {
        id: 1,
        name: 'Admin Renamed',
        phoneNumber: '+59170000001',
      };
      (staffApi as Record<string, unknown>)['updateSelf'] = vi.fn(() => of(updated));

      service.update({} as never).subscribe();

      expect(service.whatsappRelinkNeeded()).toBe(false);
      expect(notifications.success).toHaveBeenCalledTimes(1);
    });
  });
});
