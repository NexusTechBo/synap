import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClinicClockService } from '../../../../../../app/core/clinic/clinic-clock.service';
import { TopbarComponent } from '../../../../../../app/layout/shell/components/topbar/topbar.component';

describe('TopbarComponent', () => {
  const timezone = signal('Pacific/Auckland');
  const hour = signal(9);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T14:00:00Z'));
    timezone.set('Pacific/Auckland');
    hour.set(9);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ClinicClockService, useValue: { timezone, hour: () => hour() } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function render() {
    const fixture = TestBed.createComponent(TopbarComponent);
    fixture.componentRef.setInput('userName', 'Ana Pérez');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the date of the clinic timezone instead of the system one', () => {
    expect(render().textContent).toContain('18 de noviembre');
  });

  it('shows the date of a timezone behind the system one', () => {
    timezone.set('Pacific/Pago_Pago');

    expect(render().textContent).toContain('17 de noviembre');
  });

  it.each([
    [9, 'Buenos días'],
    [14, 'Buenas tardes'],
    [20, 'Buenas noches'],
  ])('greets according to the clinic hour %i', (clinicHour, greeting) => {
    hour.set(clinicHour);

    expect(render().textContent).toContain(greeting);
  });
});
