import { Dialog } from "@angular/cdk/dialog";
import { Component, provideZoneChangeDetection, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { AuthService } from "../../../../app/core/auth/auth.service";
import { ClinicCountryService } from "../../../../app/core/clinic/clinic-country.service";
import { I18nService } from "../../../../app/core/i18n/i18n.service";
import { CountryCode, Role } from "../../../../app/core/models/api.models";
import { DoctorModeCardComponent } from "../../../../app/features/profile/components/doctor-mode-card/doctor-mode-card.component";
import { RegionalSettingsCardComponent } from "../../../../app/features/profile/components/regional-settings-card/regional-settings-card.component";
import { ProfilePageComponent } from "../../../../app/features/profile/profile-page.component";
import { ProfileService } from "../../../../app/features/profile/profile.service";

@Component({ selector: "app-regional-settings-card", template: "" })
class RegionalSettingsCardStub {}

@Component({ selector: "app-doctor-mode-card", template: "" })
class DoctorModeCardStub {}

describe("ProfilePageComponent regional settings card", () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let element: HTMLElement;
  let whatsappRelinkNeeded: ReturnType<typeof signal<boolean>>;
  let clearWhatsappRelinkNotice: ReturnType<typeof vi.fn>;

  async function setup(role: Role): Promise<void> {
    const isAdmin = role === "ADMINISTRATOR";
    whatsappRelinkNeeded = signal(false);
    clearWhatsappRelinkNotice = vi.fn();

    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal("BO"), phonePlaceholder: signal("") },
        },
        { provide: Dialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            hasRole: (...roles: Role[]) => roles.includes(role),
            clinic: signal({ name: "Clínica", slug: "clinica" }),
          },
        },
      ],
    });
    TestBed.overrideComponent(ProfilePageComponent, {
      remove: {
        imports: [RegionalSettingsCardComponent, DoctorModeCardComponent],
      },
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
                name: "Ana Rojas",
                email: "ana@clinic.test",
                username: "ana",
                role,
                phoneNumber: null,
                alsoDoctor: false,
              }),
              isLoading: signal(false),
              errorMessage: signal(null),
              whatsappRelinkNeeded,
              clearWhatsappRelinkNotice,
              canToggleDoctorMode: () => isAdmin,
              reload: vi.fn(),
              update: vi.fn(),
            },
          },
        ],
      },
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => fixture.destroy());

  it("shows the regional settings card to an administrator", async () => {
    await setup("ADMINISTRATOR");

    expect(element.querySelector("app-regional-settings-card")).not.toBeNull();
  });

  it.each<Role>(["DOCTOR", "ASSISTANT"])(
    "hides the regional settings card from a %s",
    async (role) => {
      await setup(role);

      expect(element.querySelector("app-regional-settings-card")).toBeNull();
    },
  );

  it("shows a relink alert for administrator when whatsappRelinkNeeded is true and clears it on open", async () => {
    await setup("ADMINISTRATOR");
    expect(element.querySelector('[role="alert"]')).toBeNull();

    whatsappRelinkNeeded.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const alert = element.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(
      "Vuelve a vincular WhatsApp con QR o código de 8 dígitos",
    );

    const whatsappBtn = [...element.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("WhatsApp del espacio de trabajo"),
    );
    whatsappBtn?.click();

    expect(clearWhatsappRelinkNotice).toHaveBeenCalledOnce();
  });
});

describe("ProfilePageComponent password change validation", () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let element: HTMLElement;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    update = vi.fn(() => of({}));
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal("BO"), phonePlaceholder: signal("") },
        },
        { provide: Dialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            hasRole: () => false,
            clinic: signal({ name: "Clínica", slug: "clinica" }),
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
                name: "Ana Rojas",
                email: "ana@clinic.test",
                username: "ana",
                role: "ASSISTANT",
                phoneNumber: null,
                alsoDoctor: false,
              }),
              isLoading: signal(false),
              errorMessage: signal(null),
              whatsappRelinkNeeded: signal(false),
              clearWhatsappRelinkNotice: vi.fn(),
              canToggleDoctorMode: () => false,
              reload: vi.fn(),
              update,
            },
          },
        ],
      },
    });
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
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new Event("blur"));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  it("requires the current password when a new password is typed", async () => {
    await type("profile-new-password", "nuevaclave1");
    await submit();

    expect(update).not.toHaveBeenCalled();
    expect(element.textContent).toContain(
      "Ingresa tu contraseña actual para cambiarla",
    );
  });

  it("sends both passwords when the current password is provided", async () => {
    await type("profile-new-password", "nuevaclave1");
    await type("profile-current-password", "claveactual");
    await submit();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPassword: "claveactual",
        newPassword: "nuevaclave1",
      }),
    );
  });

  it("does not require the current password when no new password is typed", async () => {
    await type("profile-name", "Ana R.");
    await submit();

    expect(update).toHaveBeenCalledOnce();
    expect(update.mock.calls[0][0]).not.toHaveProperty("currentPassword");
  });
});

describe("ProfilePageComponent document by country", () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let element: HTMLElement;

  async function setup(country: CountryCode): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicCountryService,
          useValue: { country: signal(country), phonePlaceholder: signal("") },
        },
        { provide: Dialog, useValue: { open: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            hasRole: () => false,
            clinic: signal({ name: "Clínica", slug: "clinica" }),
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
                name: "Ana Rojas",
                email: "ana@clinic.test",
                username: "ana",
                role: "ASSISTANT",
                document: "52998224725",
                phoneNumber: null,
                alsoDoctor: false,
              }),
              isLoading: signal(false),
              errorMessage: signal(null),
              whatsappRelinkNeeded: signal(false),
              clearWhatsappRelinkNotice: vi.fn(),
              canToggleDoctorMode: () => false,
              reload: vi.fn(),
              update: vi.fn(),
            },
          },
        ],
      },
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => fixture.destroy());

  function documentEntry(label: string): string | undefined {
    const term = [...element.querySelectorAll("dt")].find(
      (dt) => dt.textContent?.trim() === label,
    );
    return term?.nextElementSibling?.textContent?.trim();
  }

  it("shows the CPF label and the masked CPF in a BR clinic", async () => {
    await setup("BR");

    expect(documentEntry("CPF")).toBe("529.982.247-25");
  });

  it("shows the CI label and the plain value in a BO clinic", async () => {
    await setup("BO");

    expect(documentEntry("CI")).toBe("52998224725");
  });
});
