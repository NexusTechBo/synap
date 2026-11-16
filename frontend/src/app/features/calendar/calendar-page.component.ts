import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { DAYS_OF_WEEK } from '../../core/utils/labels.util';
import { LoadErrorComponent } from '../../shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import {
  SegmentedTabItem,
  SegmentedTabsComponent,
} from '../../shared/ui/segmented-tabs/segmented-tabs.component';
import { CalendarScope } from './calendar.model';
import { CalendarService } from './calendar.service';
import { CalendarDayCellComponent } from './components/calendar-day-cell/calendar-day-cell.component';
import { CalendarNavComponent } from './components/calendar-nav/calendar-nav.component';
import { DayAgendaPanelComponent } from './components/day-agenda-panel/day-agenda-panel.component';

@Component({
  selector: 'app-calendar-page',
  imports: [
    LoadErrorComponent,
    CalendarDayCellComponent,
    PageHeaderComponent,
    SegmentedTabsComponent,
    CalendarNavComponent,
    DayAgendaPanelComponent,
  ],
  providers: [CalendarService],
  templateUrl: './calendar-page.component.html',
  host: { class: 'flex flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPageComponent {
  private readonly i18n = inject(I18nService);
  protected readonly calendar = inject(CalendarService);

  protected readonly weekdays = computed(() => {
    this.i18n.currentLang();
    return DAYS_OF_WEEK.map((day) => ({
      value: day.value,
      short: this.i18n.translate(`days.${day.value}.short`),
    }));
  });

  protected readonly scopeTabs = computed<SegmentedTabItem[]>(() => {
    this.i18n.currentLang();
    return [
      { id: 'all', label: this.i18n.translate('calendar.scopeAll') },
      { id: 'mine', label: this.i18n.translate('calendar.scopeMine') },
    ];
  });

  protected setScope(scope: string): void {
    this.calendar.setScope(scope as CalendarScope);
  }
}
