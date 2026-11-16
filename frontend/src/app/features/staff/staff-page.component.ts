import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, Injector, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { Role, Staff } from '../../core/models/api.models';
import { InitialsPipe } from '../../shared/pipes/initials.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { labelledByFrame } from '../../shared/ui/dialog-frame/dialog-frame.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { LoadErrorComponent } from '../../shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { PaginationComponent } from '../../shared/ui/pagination/pagination.component';
import {
  SegmentedTabItem,
  SegmentedTabsComponent,
} from '../../shared/ui/segmented-tabs/segmented-tabs.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { UiIconComponent } from '../../shared/ui/ui-icon/ui-icon.component';
import { focusAfterLoad } from '../../shared/utils/focus-after-load.util';
import {
  StaffFormData,
  StaffFormDialogComponent,
} from './components/staff-form-dialog/staff-form-dialog.component';
import { StaffRoleFilter } from './staff.model';
import { StaffService } from './staff.service';

@Component({
  selector: 'app-staff-page',
  imports: [
    InitialsPipe,
    TranslatePipe,
    LoadErrorComponent,
    SkeletonComponent,
    FormsModule,
    PageHeaderComponent,
    SegmentedTabsComponent,
    PaginationComponent,
    EmptyStateComponent,
    UiIconComponent,
  ],
  providers: [StaffService],
  templateUrl: './staff-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffPageComponent {
  private readonly dialog = inject(Dialog);
  private readonly injector = inject(Injector);
  private readonly i18n = inject(I18nService);
  protected readonly staffService = inject(StaffService);
  private readonly focusRow = focusAfterLoad(this.staffService.isLoading);

  protected readonly roleLabel = computed<Record<Role, string>>(() => {
    this.i18n.currentLang();
    return {
      ADMINISTRATOR: this.i18n.translate('roles.ADMINISTRATOR'),
      DOCTOR: this.i18n.translate('roles.DOCTOR'),
      ASSISTANT: this.i18n.translate('roles.ASSISTANT'),
    };
  });

  protected readonly myId = inject(AuthService).userId();

  protected readonly tabs = computed<SegmentedTabItem[]>(() => {
    this.i18n.currentLang();
    return [
      { id: 'all', label: this.i18n.translate('staff.tabs.all') },
      { id: 'DOCTOR', label: this.i18n.translate('staff.tabs.doctors') },
      { id: 'ASSISTANT', label: this.i18n.translate('staff.tabs.assistants') },
    ];
  });

  protected setRole(role: string): void {
    this.staffService.setRole(role as StaffRoleFilter);
  }

  protected deactivate(staff: Staff): void {
    this.staffService
      .deactivate(staff)
      .subscribe(() =>
        this.focusRow(`#staff-status-${staff.id}`, `#staff-edit-${staff.id}`, 'tbody button'),
      );
  }

  protected activate(staff: Staff): void {
    this.staffService
      .activate(staff)
      .subscribe(() => this.focusRow(`#staff-status-${staff.id}`, 'tbody button'));
  }

  protected openForm(staff?: Staff): void {
    this.dialog.open<void, StaffFormData>(StaffFormDialogComponent, {
      ...labelledByFrame(),
      data: { staff },
      injector: this.injector,
    });
  }
}
