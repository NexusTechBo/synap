import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GuestSessionService } from '../../core/auth/guest-session.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { datePart, formatLongDate } from '../../core/utils/calendar.util';
import { DoctorPickerComponent } from '../../shared/components/doctor-picker/doctor-picker.component';
import { SlotGridComponent } from '../../shared/components/slot-grid/slot-grid.component';
import { SpecialtyFilterComponent } from '../../shared/components/specialty-filter/specialty-filter.component';
import { SpecialtyLabelPipe } from '../../shared/pipes/specialty-label.pipe';
import { TimeRangePipe } from '../../shared/pipes/time-range.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AlertComponent } from '../../shared/ui/alert/alert.component';
import { DatePickerComponent } from '../../shared/ui/forms/date-picker/date-picker.component';
import { DateStripComponent } from '../../shared/ui/forms/date-strip/date-strip.component';
import { GlassBackgroundComponent } from '../../shared/ui/glass-background/glass-background.component';
import { LoadErrorComponent } from '../../shared/ui/load-error/load-error.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { UiIconComponent } from '../../shared/ui/ui-icon/ui-icon.component';
import { GuestPatientFormComponent } from './components/guest-patient-form/guest-patient-form.component';
import { STEP_TITLE_KEYS } from './guest-booking.model';
import { GuestBookingService } from './guest-booking.service';

@Component({
  selector: 'app-guest-booking',
  imports: [
    AlertComponent,
    DatePickerComponent,
    DateStripComponent,
    FormsModule,
    GlassBackgroundComponent,
    GuestPatientFormComponent,
    LoadErrorComponent,
    SlotGridComponent,
    SpecialtyFilterComponent,
    DoctorPickerComponent,
    SkeletonComponent,
    SpecialtyLabelPipe,
    TimeRangePipe,
    TranslatePipe,
    UiIconComponent,
  ],
  providers: [GuestBookingService],
  templateUrl: './guest-booking.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestBookingComponent implements OnInit {
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  protected readonly session = inject(GuestSessionService);
  protected readonly booking = inject(GuestBookingService);

  private lastView: string | null = null;

  protected readonly sessionRetryLabel = computed(() => {
    this.i18n.currentLang();
    return this.session.coolingDown()
      ? `${this.i18n.translate('guestBooking.retryIn')} ${this.session.retryInLabel()}`
      : this.i18n.translate('guestBooking.retryButton');
  });
  protected readonly stepTitle = computed(() => {
    this.i18n.currentLang();
    return this.i18n.translate(STEP_TITLE_KEYS[this.booking.step()]);
  });
  protected readonly dateLabel = computed(() => {
    this.i18n.currentLang();
    return formatLongDate(this.booking.selectedDate());
  });
  protected readonly resultDateLabel = computed(() => {
    this.i18n.currentLang();
    const result = this.booking.result();
    return result ? formatLongDate(datePart(result.startTime)) : '';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.session.releaseTimezone());
    afterRenderEffect(() => {
      const view = this.session.ready() ? this.booking.step() : this.session.status();
      const heading = this.heading()?.nativeElement;
      if (this.lastView !== null && view !== this.lastView) heading?.focus();
      this.lastView = view;
    });
  }

  ngOnInit(): void {
    this.session.start(this.route.snapshot.queryParamMap.get('slug'));
  }
}
