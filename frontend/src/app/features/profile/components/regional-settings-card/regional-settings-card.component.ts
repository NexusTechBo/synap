import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, finalize, map, of, startWith, switchMap, tap } from 'rxjs';
import { ClinicRegionalSettingsStore } from '../../../../core/clinic/clinic-regional-settings.store';
import { RegionsStore } from '../../../../core/clinic/regions.store';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ClinicRegionalSettings } from '../../../../core/models/api.models';
import {
  RegionalFieldsComponent,
  createRegionalForm,
} from '../../../../shared/components/regional-fields/regional-fields.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { LoadErrorComponent } from '../../../../shared/ui/load-error/load-error.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';

@Component({
  selector: 'app-regional-settings-card',
  imports: [
    LoadErrorComponent,
    ReactiveFormsModule,
    RegionalFieldsComponent,
    SkeletonComponent,
    TranslatePipe,
  ],
  templateUrl: './regional-settings-card.component.html',
  host: { class: 'glass-panel block min-w-0 rounded-3xl p-6' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalSettingsCardComponent {
  private readonly store = inject(ClinicRegionalSettingsStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  protected readonly regions = inject(RegionsStore);

  protected readonly form = createRegionalForm({}, [Validators.required]);
  protected readonly saving = signal(false);
  protected readonly hasError = computed(() => this.store.hasError() || this.regions.hasError());
  protected readonly loading = computed(
    () => this.store.isLoading() || this.regions.isLoading() || !this.store.settings(),
  );

  private readonly value = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { requireSync: true },
  );
  protected readonly changed = computed(() => {
    const saved = this.store.settings();
    const { country, timezone, defaultLanguage } = this.value();
    return (
      !!saved &&
      (saved.country !== country ||
        saved.timezone !== timezone ||
        saved.defaultLanguage !== defaultLanguage)
    );
  });

  constructor() {
    this.store.load();
    effect(() => {
      const saved = this.store.settings();
      if (saved && this.form.pristine) untracked(() => this.form.reset(saved));
    });
  }

  protected retry(): void {
    if (this.store.hasError()) this.store.load();
    if (this.regions.hasError()) this.regions.reload();
  }

  protected save(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { country, timezone, defaultLanguage } = this.form.getRawValue();
    if (!country || !defaultLanguage) return;
    const request: ClinicRegionalSettings = { country, timezone, defaultLanguage };
    const timezoneChanged = timezone !== this.store.settings()?.timezone;

    const confirmed$ = timezoneChanged
      ? this.confirm.ask({
          title: this.i18n.translate('regional.confirmTitle'),
          message: this.i18n.translate('regional.confirmMessage'),
          confirmLabel: this.i18n.translate('regional.confirmLabel'),
        })
      : of(true);

    confirmed$
      .pipe(
        filter(Boolean),
        tap(() => this.saving.set(true)),
        switchMap(() => this.store.update(request).pipe(finalize(() => this.saving.set(false)))),
      )
      .subscribe({
        next: (saved) => {
          this.form.reset(saved);
          this.notifications.success(this.i18n.translate('regional.saved'));
        },
        error: (error) =>
          this.notifications.error(
            apiErrorMessage(error, this.i18n.translate('regional.saveError')),
          ),
      });
  }
}
