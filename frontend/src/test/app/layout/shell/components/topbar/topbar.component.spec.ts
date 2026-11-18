import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClinicClockService } from '../../../../../../app/core/clinic/clinic-clock.service';
import { TopbarComponent } from '../../../../../../app/layout/shell/components/topbar/topbar.component';

describe('TopbarComponent', () => {
  const timezone = signal('Pacific/Auckland');
  const hour = signal(9);
  const clockTick = signal(0);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T14:00:00Z'));
    timezone.set('Pacific/Auckland');
    hour.set(9);
    clockTick.set(0);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ClinicClockService,
          useValue: {
            timezone,
            hour: () => hour(),
            today: () => {
              clockTick();
              return new Intl.DateTimeFormat('en-CA', { timeZone: timezone() }).format(new Date());
            },
          },
        },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  function renderFixture() {
    const fixture = TestBed.createComponent(TopbarComponent);
    fixture.componentRef.setInput('userName', 'Ana Pérez');
    fixture.detectChanges();
    return fixture;
  }

  function render() {
    return renderFixture().nativeElement as HTMLElement;
  }

  it('shows the date of the clinic timezone instead of the system one', () => {
    expect(render().textContent).toContain('18 de noviembre');
  });

  it('shows the date of a timezone behind the system one', () => {
    timezone.set('Pacific/Pago_Pago');

    expect(render().textContent).toContain('17 de noviembre');
  });

  it('updates the date when the clinic day changes', () => {
    const fixture = renderFixture();
    expect(fixture.nativeElement.textContent).toContain('18 de noviembre');

    vi.setSystemTime(new Date('2026-11-18T14:00:00Z'));
    clockTick.update((value) => value + 1);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('19 de noviembre');
  });

  it('updates the greeting when the clinic hour changes', () => {
    const fixture = renderFixture();
    expect(fixture.nativeElement.textContent).toContain('Buenos días');

    hour.set(14);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Buenas tardes');

    hour.set(19);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Buenas noches');
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
