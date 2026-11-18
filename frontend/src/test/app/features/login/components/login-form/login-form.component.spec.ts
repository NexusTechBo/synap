import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { LoginFormComponent } from '../../../../../../app/features/login/components/login-form/login-form.component';
import { LoginService } from '../../../../../../app/features/login/login.service';

describe('LoginFormComponent', () => {
  it('renders the back to home link', async () => {
    TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LoginService,
          useValue: {
            submitting: signal(false),
            pendingActivation: signal(false),
            coolingDown: signal(false),
            retryInLabel: signal(''),
            cooldownFinished: signal(false),
            login: vi.fn(),
          },
        },
      ],
    });
    await TestBed.inject(I18nService).init();
    const fixture = TestBed.createComponent(LoginFormComponent);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('app-back-to-home-link a');

    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.textContent?.trim()).toBe('Volver al inicio');
  });
});
