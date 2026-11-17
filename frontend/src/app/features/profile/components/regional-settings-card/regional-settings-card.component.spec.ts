import { HttpErrorResponse } from '@angular/common/http';
import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ClinicRegionalSettingsStore } from '../../../../core/clinic/clinic-regional-settings.store';
import { RegionsStore } from '../../../../core/clinic/regions.store';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ClinicRegionalSettings, RegionCountry } from '../../../../core/models/api.models';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { RegionalSettingsCardComponent } from './regional-settings-card.component';

const COUNTRIES: RegionCountry[] = [
  {
    code: 'BO',
    defaultTimezone: 'America/La_Paz',
    timezones: ['America/La_Paz'],
    defaultLanguage: 'es',
    phonePlaceholder: '+591 70000000',
  },
  {
    code: 'BR',
    defaultTimezone: 'America/Sao_Paulo',
    timezones: ['America/Sao_Paulo', 'America/Manaus'],
    defaultLanguage: 'pt-BR',
    phonePlaceholder: '+55 11 91234-5678',
  },
];

const SAVED: ClinicRegionalSettings = {
  country: 'BR',
  timezone: 'America/Sao_Paulo',
  defaultLanguage: 'pt-BR',
};

describe('RegionalSettingsCardComponent', () => {
  let fixture: ComponentFixture<RegionalSettingsCardComponent>;
  let element: HTMLElement;

  let settings: ReturnType<typeof signal<ClinicRegionalSettings | null>>;
  let storeLoading: ReturnType<typeof signal<boolean>>;
  let storeError: ReturnType<typeof signal<string | null>>;
  let regionsLoading: ReturnType<typeof signal<boolean>>;
  let regionsError: ReturnType<typeof signal<string | null>>;
  let store: {
    load: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let regions: { reload: ReturnType<typeof vi.fn> };
  let confirm: { ask: ReturnType<typeof vi.fn> };
  let notifications: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    settings = signal<ClinicRegionalSettings | null>(SAVED);
    storeLoading = signal(false);
    storeError = signal<string | null>(null);
    regionsLoading = signal(false);
    regionsError = signal<string | null>(null);
    store = {
      load: vi.fn(),
      update: vi.fn((value: ClinicRegionalSettings): Observable<ClinicRegionalSettings> =>
        of(value),
      ),
    };
    regions = { reload: vi.fn() };
    confirm = { ask: vi.fn(() => of(true)) };
    notifications = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      imports: [RegionalSettingsCardComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: ClinicRegionalSettingsStore,
          useValue: {
            settings,
            isLoading: storeLoading,
            errorMessage: storeError,
            load: store.load,
            update: store.update,
          },
        },
        {
          provide: RegionsStore,
          useValue: {
            countries: signal(COUNTRIES),
            languages: signal(['es', 'en', 'pt-BR']),
            country: (code: string) => COUNTRIES.find((c) => c.code === code),
            isLoading: regionsLoading,
            errorMessage: regionsError,
            reload: regions.reload,
          },
        },
        { provide: ConfirmService, useValue: confirm },
        { provide: NotificationService, useValue: notifications },
      ],
    });
    localStorage.setItem('lang', 'es');
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(RegionalSettingsCardComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  function saveButton(): HTMLButtonElement {
    return [...element.querySelectorAll<HTMLButtonElement>('button[type="submit"]')][0];
  }

  async function pick(id: string, label: string): Promise<void> {
    element.querySelector<HTMLButtonElement>(`button[id="profile-regional-${id}"]`)!.click();
    await fixture.whenStable();
    [...document.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((el) => el.textContent?.trim() === label)!
      .click();
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('requests a refresh of the settings on creation', () => {
    expect(store.load).toHaveBeenCalledOnce();
  });

  it('keeps the save button disabled while nothing changed', () => {
    expect(saveButton().disabled).toBe(true);
  });

  it('enables the save button once a value changes', async () => {
    await pick('language', 'English');

    expect(saveButton().disabled).toBe(false);
  });

  it('asks for confirmation when the time zone changes and saves when confirmed', async () => {
    await pick('timezone', 'America/Manaus');

    await submit();

    expect(confirm.ask).toHaveBeenCalledOnce();
    expect(store.update).toHaveBeenCalledWith({ ...SAVED, timezone: 'America/Manaus' });
    expect(notifications.success).toHaveBeenCalledWith('Configuración regional actualizada');
  });

  it('does not send the PUT when the confirmation is cancelled', async () => {
    confirm.ask.mockReturnValue(of(false));
    await pick('timezone', 'America/Manaus');

    await submit();

    expect(confirm.ask).toHaveBeenCalledOnce();
    expect(store.update).not.toHaveBeenCalled();
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('saves without confirmation when the time zone is unchanged', async () => {
    await pick('language', 'English');

    await submit();

    expect(confirm.ask).not.toHaveBeenCalled();
    expect(store.update).toHaveBeenCalledWith({ ...SAVED, defaultLanguage: 'en' });
    expect(notifications.success).toHaveBeenCalledOnce();
  });

  it('shows the API error through notifications.error when the PUT fails', async () => {
    store.update.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { status: 400, message: 'Zona no soportada' },
          }),
      ),
    );
    await pick('language', 'English');

    await submit();

    expect(notifications.error).toHaveBeenCalledWith('Zona no soportada');
    expect(notifications.success).not.toHaveBeenCalled();
  });

  it('falls back to the generic save error message', async () => {
    store.update.mockReturnValue(throwError(() => new Error('boom')));
    await pick('language', 'English');

    await submit();

    expect(notifications.error).toHaveBeenCalledWith(
      'No se pudo guardar la configuración regional',
    );
  });

  it('resets the form with the saved response so the button is disabled again', async () => {
    await pick('language', 'English');

    await submit();
    settings.set({ ...SAVED, defaultLanguage: 'en' });
    await fixture.whenStable();

    expect(saveButton().disabled).toBe(true);
  });

  it('keeps the user edits when the store value changes while the form is dirty', async () => {
    await pick('language', 'English');

    settings.set({ ...SAVED, timezone: 'America/Manaus' });
    await fixture.whenStable();

    expect(element.querySelector('button[id="profile-regional-language"]')!.textContent).toContain(
      'English',
    );
  });

  describe('loading and error states', () => {
    it('shows a status skeleton while the store is loading', async () => {
      storeLoading.set(true);
      await fixture.whenStable();

      expect(element.querySelector('[role="status"]')).not.toBeNull();
      expect(element.querySelector('form')).toBeNull();
    });

    it('shows a status skeleton while the catalog is loading', async () => {
      regionsLoading.set(true);
      await fixture.whenStable();

      expect(element.querySelector('[role="status"]')).not.toBeNull();
    });

    it('shows a status skeleton while there are no settings yet', async () => {
      settings.set(null);
      await fixture.whenStable();

      expect(element.querySelector('[role="status"]')).not.toBeNull();
      expect(element.querySelector('form')).toBeNull();
    });

    it('shows the load error and retries the settings through the store', async () => {
      storeError.set('No se pudo cargar la configuración regional');
      await fixture.whenStable();

      expect(element.querySelector('app-load-error')).not.toBeNull();
      expect(element.querySelector('form')).toBeNull();
      element.querySelector<HTMLButtonElement>('app-load-error button')!.click();

      expect(store.load).toHaveBeenCalledTimes(2);
      expect(regions.reload).not.toHaveBeenCalled();
    });

    it('retries the catalog when it is the one that failed', async () => {
      regionsError.set('No se pudo cargar el catálogo regional');
      await fixture.whenStable();

      element.querySelector<HTMLButtonElement>('app-load-error button')!.click();

      expect(regions.reload).toHaveBeenCalledOnce();
      expect(store.load).toHaveBeenCalledOnce();
    });
  });
});
