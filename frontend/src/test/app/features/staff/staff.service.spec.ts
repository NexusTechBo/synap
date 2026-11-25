import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { StaffApi } from '../../../../app/core/api/staff.api';
import { DoctorsStore } from '../../../../app/core/catalogs/doctors.store';
import { SpecialtiesStore } from '../../../../app/core/catalogs/specialties.store';
import { I18nService } from '../../../../app/core/i18n/i18n.service';
import { Staff, StaffUpdateRequest } from '../../../../app/core/models/api.models';
import { StaffService } from '../../../../app/features/staff/staff.service';
import { ConfirmService } from '../../../../app/shared/services/confirm.service';
import { NotificationService } from '../../../../app/shared/services/notification.service';

const MEMBER = {
  id: 1,
  username: 'ana',
  document: null,
  name: 'Ana',
  email: 'ana@clinic.test',
  phoneNumber: '+59170000001',
  active: true,
  alsoDoctor: false,
  role: 'ASSISTANT',
  specialtyId: null,
  specialtyName: null,
} as Staff;

const REQUEST = {} as StaffUpdateRequest;

describe('StaffService.update', () => {
  let service: StaffService;
  let api: { list: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let notifications: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let doctorsStore: { invalidate: ReturnType<typeof vi.fn> };

  async function setup(): Promise<void> {
    api = {
      list: vi.fn(() =>
        of({
          content: [MEMBER],
          page: { size: 12, number: 0, totalElements: 1, totalPages: 1 },
        }),
      ),
      update: vi.fn(() => of(MEMBER)),
    };
    notifications = { success: vi.fn(), error: vi.fn() };
    doctorsStore = { invalidate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        StaffService,
        { provide: StaffApi, useValue: api },
        { provide: SpecialtiesStore, useValue: { specialties: signal([]), load: vi.fn() } },
        { provide: DoctorsStore, useValue: doctorsStore },
        { provide: ConfirmService, useValue: { confirmThen: vi.fn() } },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    await TestBed.inject(I18nService).init();
    service = TestBed.inject(StaffService);
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('notifies success once and invalidates doctors after updating', async () => {
    await setup();

    service.update(1, REQUEST).subscribe();

    expect(api.update).toHaveBeenCalledWith(1, REQUEST);
    expect(notifications.success).toHaveBeenCalledOnce();
    expect(doctorsStore.invalidate).toHaveBeenCalledOnce();
  });

  it('does not notify nor invalidate doctors when the update fails', async () => {
    await setup();
    api.update.mockReturnValue(throwError(() => new Error('boom')));

    service.update(1, REQUEST).subscribe({ error: () => undefined });

    expect(notifications.success).not.toHaveBeenCalled();
    expect(doctorsStore.invalidate).not.toHaveBeenCalled();
  });
});
