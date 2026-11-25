import { Dialog } from '@angular/cdk/dialog';
import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { I18nService } from '../../../../app/core/i18n/i18n.service';
import { Role, Staff } from '../../../../app/core/models/api.models';
import { StaffPageComponent } from '../../../../app/features/staff/staff-page.component';
import { StaffService } from '../../../../app/features/staff/staff.service';

function member(id: number, name: string, role: Role): Staff {
  return {
    id,
    username: name.toLowerCase(),
    document: null,
    name,
    email: `${name.toLowerCase()}@clinic.test`,
    phoneNumber: null,
    active: true,
    alsoDoctor: false,
    role,
    specialtyId: null,
    specialtyName: null,
  } as Staff;
}

describe('StaffPageComponent', () => {
  let fixture: ComponentFixture<StaffPageComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [StaffPageComponent],
      providers: [
        provideZoneChangeDetection(),
        { provide: Dialog, useValue: { open: vi.fn() } },
        { provide: AuthService, useValue: { userId: () => 99 } },
      ],
    });
    TestBed.overrideComponent(StaffPageComponent, {
      set: {
        providers: [
          {
            provide: StaffService,
            useValue: {
              staff: signal([
                member(1, 'Root', 'ADMINISTRATOR'),
                member(2, 'Dana', 'DOCTOR'),
                member(3, 'Ari', 'ASSISTANT'),
              ]),
              isLoading: signal(false),
              errorMessage: signal(null),
              pagination: signal(null),
              roleFilter: signal('all'),
              onlyActive: signal(true),
              setRole: vi.fn(),
              setOnlyActive: vi.fn(),
              setPage: vi.fn(),
              reload: vi.fn(),
            },
          },
        ],
      },
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(StaffPageComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('does not offer the edit action for administrators', () => {
    expect(element.querySelector('#staff-edit-1')).toBeNull();
  });

  it.each([2, 3])('offers the edit action for non administrator member %i', (id) => {
    expect(element.querySelector(`#staff-edit-${id}`)).not.toBeNull();
  });
});
