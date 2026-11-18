import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { RegisterSuccessComponent } from '../../../../../../app/features/register/components/register-success/register-success.component';

describe('RegisterSuccessComponent', () => {
  it('renders the back to home link', async () => {
    TestBed.configureTestingModule({
      imports: [RegisterSuccessComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    await TestBed.inject(I18nService).init();
    const fixture = TestBed.createComponent(RegisterSuccessComponent);
    fixture.componentRef.setInput('email', 'admin@email.com');
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('app-back-to-home-link a');

    expect(link?.getAttribute('href')).toBe('/');
    expect(link?.textContent?.trim()).toBe('Volver al inicio');
  });
});
