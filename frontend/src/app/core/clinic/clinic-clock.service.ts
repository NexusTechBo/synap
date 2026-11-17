import { Injectable, computed, inject } from '@angular/core';
import { GuestSessionService } from '../auth/guest-session.service';
import { ClinicRegionalSettingsStore } from './clinic-regional-settings.store';

const CLOCK_PART_TYPES = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;

type ClockParts = Record<(typeof CLOCK_PART_TYPES)[number], string>;

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

  readonly timezone = computed(
    () =>
      this.regionalSettings.settings()?.timezone ??
      this.guestSession.timezone() ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

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

  private parts(): ClockParts {
    const parts = {} as ClockParts;
    for (const { type, value } of formatterFor(this.timezone()).formatToParts(new Date())) {
      if ((CLOCK_PART_TYPES as readonly string[]).includes(type)) {
        parts[type as keyof ClockParts] = value;
      }
    }
    return parts;
  }
}
