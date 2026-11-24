import { Injectable, computed, inject, signal } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { Observable, finalize, tap } from "rxjs";
import { StaffApi } from "../../core/api/staff.api";
import { DoctorsStore } from "../../core/catalogs/doctors.store";
import { SpecialtiesStore } from "../../core/catalogs/specialties.store";
import { resourceError } from "../../core/http/api-error";
import { I18nService } from "../../core/i18n/i18n.service";
import {
  Staff,
  StaffFilters,
  StaffRegisterRequest,
  StaffUpdateRequest,
} from "../../core/models/api.models";
import { ConfirmService } from "../../shared/services/confirm.service";
import { NotificationService } from "../../shared/services/notification.service";
import { StaffRoleFilter } from "./staff.model";

const PAGE_SIZE = 12;

function isDoctor(staff: Staff): boolean {
  return staff.role === "DOCTOR" || staff.alsoDoctor;
}

@Injectable()
export class StaffService {
  private readonly staffApi = inject(StaffApi);
  private readonly specialtiesStore = inject(SpecialtiesStore);
  private readonly doctorsStore = inject(DoctorsStore);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);

  private readonly filters = signal<StaffFilters>({
    page: 0,
    size: PAGE_SIZE,
    sort: "id",
    isActive: true,
  });

  private readonly staffResource = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.staffApi.list(params),
  });
  readonly specialties = this.specialtiesStore.specialties;
  readonly isLoading = this.staffResource.isLoading;

  readonly staff = computed(() =>
    this.staffResource.hasValue() ? this.staffResource.value().content : [],
  );
  readonly pagination = computed(() =>
    this.staffResource.hasValue() ? this.staffResource.value().page : null,
  );
  readonly roleFilter = computed<StaffRoleFilter>(
    () => this.filters().role ?? "all",
  );
  readonly onlyActive = computed(() => this.filters().isActive === true);
  readonly errorMessage = resourceError(
    this.staffResource,
    this.i18n,
    this.i18n.translate("staff.errors.load"),
  );

  constructor() {
    this.specialtiesStore.load();
  }

  reload(): void {
    this.staffResource.reload();
  }

  setRole(role: StaffRoleFilter): void {
    this.updateFilters({ role: role === "all" ? undefined : role });
  }

  setOnlyActive(onlyActive: boolean): void {
    this.updateFilters({ isActive: onlyActive ? true : undefined });
  }

  setPage(page: number): void {
    this.filters.update((current) => ({ ...current, page }));
  }

  create(request: StaffRegisterRequest): Observable<Staff> {
    return this.afterSave(
      this.staffApi.create(request),
      this.i18n.translate("staff.notifications.created"),
    );
  }

  update(id: number, request: StaffUpdateRequest): Observable<Staff> {
    const previous = this.staff().find((member) => member.id === id);
    const previousPhone = previous?.phoneNumber ?? null;

    return this.afterSave(
      this.staffApi.update(id, request).pipe(
        tap((updated) => {
          if (
            updated.role === "ADMINISTRATOR" &&
            previous !== undefined &&
            (updated.phoneNumber ?? null) !== previousPhone
          ) {
            this.notifications.success(
              this.i18n.translate(
                "profile.notifications.whatsappRelinkRequired",
              ),
            );
          }
        }),
      ),
      this.i18n.translate("staff.notifications.updated"),
    );
  }

  deactivate(staff: Staff): Observable<unknown> {
    const message = isDoctor(staff)
      ? `${staff.name} ${this.i18n.translate("staff.confirm.deactivateDoctorSuffix")}`
      : `${this.i18n.translate("staff.confirm.deactivateStaffPrefix")} ${staff.name}?`;

    return this.confirm
      .confirmThen(
        {
          title: this.i18n.translate("staff.confirm.deactivateTitle"),
          message,
          confirmLabel: this.i18n.translate("staff.confirm.deactivateLabel"),
          danger: true,
        },
        () => this.staffApi.deactivate(staff.id),
        this.i18n.translate("staff.notifications.deactivated"),
        this.i18n.translate("staff.errors.deactivate"),
      )
      .pipe(tap(() => this.afterChange()));
  }

  activate(staff: Staff): Observable<unknown> {
    return this.confirm
      .confirmThen(
        {
          title: this.i18n.translate("staff.confirm.reactivateTitle"),
          message: `${this.i18n.translate("staff.confirm.reactivatePrefix")} ${staff.name}?`,
          confirmLabel: this.i18n.translate("staff.confirm.reactivateLabel"),
        },
        () => this.staffApi.activate(staff.id),
        this.i18n.translate("staff.notifications.reactivated"),
        this.i18n.translate("staff.errors.reactivate"),
      )
      .pipe(tap(() => this.afterChange()));
  }

  private afterSave(
    request: Observable<Staff>,
    message: string,
  ): Observable<Staff> {
    return request.pipe(
      tap(() => {
        this.notifications.success(message);
        this.doctorsStore.invalidate();
      }),
      finalize(() => this.reload()),
    );
  }

  private afterChange(): void {
    this.reload();
    this.doctorsStore.invalidate();
  }

  private updateFilters(patch: Partial<StaffFilters>): void {
    this.filters.update((current) => ({ ...current, page: 0, ...patch }));
  }
}
