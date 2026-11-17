import { Dialog } from '@angular/cdk/dialog';
import { Component, provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Role } from '../../core/models/api.models';
import { DoctorModeCardComponent } from './components/doctor-mode-card/doctor-mode-card.component';
import { RegionalSettingsCardComponent } from './components/regional-settings-card/regional-settings-card.component';
import { ProfilePageComponent } from './profile-page.component';
import { ProfileService } from './profile.service';

@Component({ selector: 'app-regional-settings-card', template: '' })
class RegionalSettingsCardStub {}

@Component({ selector: 'app-doctor-mode-card', template: '' })
class DoctorModeCardStub {}

describe('ProfilePageComponent regional settings card', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let element: HTMLElement;

  async function setup(role: Role): Promise<void> {
    const isAdmin = role === 'ADMINISTRATOR';
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideZoneChangeDetection(),
        { provide: Dialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            hasRole: (...roles: Role[]) => roles.includes(role),
            clinic: signal({ name: 'Clínica', slug: 'clinica' }),
          },
        },
      ],
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      remove: { imports: [RegionalSettingsCardComponent, DoctorModeCardComponent] },
      add: { imports: [RegionalSettingsCardStub, DoctorModeCardStub] },
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      set: {
        providers: [
          {
            provide: ProfileService,
            useValue: {
              me: signal({
                id: 1,
                name: 'Ana Rojas',
                email: 'ana@clinic.test',
                username: 'ana',
                role,
                phoneNumber: null,
                alsoDoctor: false,
              }),
              isLoading: signal(false),
              errorMessage: signal(null),
              canToggleDoctorMode: () => isAdmin,
              reload: vi.fn(),
              update: vi.fn(),
            },
          },
        ],
      },
    });
    localStorage.setItem('lang', 'es');
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => fixture.destroy());

  it('shows the regional settings card to an administrator', async () => {
    await setup('ADMINISTRATOR');

    expect(element.querySelector('app-regional-settings-card')).not.toBeNull();
  });

  it.each<Role>(['DOCTOR', 'ASSISTANT'])(
    'hides the regional settings card from a %s',
    async (role) => {
      await setup(role);

      expect(element.querySelector('app-regional-settings-card')).toBeNull();
    },
  );
});

describe('ProfilePageComponent password change validation', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let element: HTMLElement;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    update = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideZoneChangeDetection(),
        { provide: Dialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            hasRole: () => false,
            clinic: signal({ name: 'Clínica', slug: 'clinica' }),
          },
        },
      ],
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      set: {
        providers: [
          {
            provide: ProfileService,
            useValue: {
              me: signal({
                id: 1,
                name: 'Ana Rojas',
                email: 'ana@clinic.test',
                username: 'ana',
                role: 'ASSISTANT',
                phoneNumber: null,
                alsoDoctor: false,
              }),
              isLoading: signal(false),
              errorMessage: signal(null),
              canToggleDoctorMode: () => false,
              reload: vi.fn(),
              update,
            },
          },
        ],
      },
    });
    localStorage.setItem('lang', 'es');
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  async function type(id: string, value: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it('requires the current password when a new password is typed', async () => {
    await type('profile-new-password', 'nuevaclave1');
    await submit();

    expect(update).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Ingresa tu contraseña actual para cambiarla');
  });

  it('sends both passwords when the current password is provided', async () => {
    await type('profile-new-password', 'nuevaclave1');
    await type('profile-current-password', 'claveactual');
    await submit();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ currentPassword: 'claveactual', newPassword: 'nuevaclave1' }),
    );
  });

  it('does not require the current password when no new password is typed', async () => {
    await type('profile-name', 'Ana R.');
    await submit();

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0]).not.toHaveProperty('currentPassword');
  });
});
