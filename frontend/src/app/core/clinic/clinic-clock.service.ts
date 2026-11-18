import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  NgZone,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { GuestSessionService } from '../auth/guest-session.service';
import { ClinicRegionalSettingsStore } from './clinic-regional-settings.store';

const CLOCK_PART_TYPES = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;

type ClockParts = Record<(typeof CLOCK_PART_TYPES)[number], string>;

const SECONDS_PER_DAY = 86_400;
const REFRESH_SECONDS_OF_DAY = [12 * 3_600, 19 * 3_600, SECONDS_PER_DAY];
const REFRESH_MARGIN_MS = 500;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

@Injectable({ providedIn: 'root' })
export class ClinicClockService {
  private readonly regionalSettings = inject(ClinicRegionalSettingsStore);
  private readonly guestSession = inject(GuestSessionService);
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly tick = signal(0);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly timezone = computed(
    () =>
      this.regionalSettings.settings()?.timezone ??
      this.guestSession.timezone() ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  constructor() {
    effect(() => {
      this.timezone();
      untracked(() => this.scheduleNextRefresh());
    });

    const onVisibilityChange = () => {
      if (this.document.visibilityState !== 'visible') return;
      this.refresh();
    };
    this.document.addEventListener('visibilitychange', onVisibilityChange);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(this.timer);
    });
  }

  today(): string {
    const { year, month, day } = this.parts();
    return `${year}-${month}-${day}`;
  }

  now(): string {
    const { hour, minute, second } = this.parts();
    return `${this.today()}T${hour}:${minute}:${second}`;
  }

  hour(): number {
    return Number(this.parts().hour);
  }

  private refresh(): void {
    this.tick.update((value) => value + 1);
    this.scheduleNextRefresh();
  }

  private scheduleNextRefresh(): void {
    clearTimeout(this.timer);
    const { hour, minute, second } = this.parts();
    const secondOfDay = Number(hour) * 3_600 + Number(minute) * 60 + Number(second);
    const nextCutoff =
      REFRESH_SECONDS_OF_DAY.find((cutoff) => cutoff > secondOfDay) ?? SECONDS_PER_DAY;
    const delay = (nextCutoff - secondOfDay) * 1000 + REFRESH_MARGIN_MS;
    this.timer = this.zone.runOutsideAngular(() =>
      setTimeout(() => this.zone.run(() => this.refresh()), delay),
    );
  }

  private parts(): ClockParts {
    this.tick();
    const parts = {} as ClockParts;
    for (const { type, value } of formatterFor(this.timezone()).formatToParts(new Date())) {
      if ((CLOCK_PART_TYPES as readonly string[]).includes(type)) {
        parts[type as keyof ClockParts] = value;
      }
    }
    return parts;
  }
}
