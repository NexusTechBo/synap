import { Clipboard } from '@angular/cdk/clipboard';
import { Dialog } from '@angular/cdk/dialog';
import { provideZoneChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../../../app/core/auth/auth.service';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { GuestLinkButtonComponent } from '../../../../../../app/features/appointments/components/guest-link-button/guest-link-button.component';

describe('GuestLinkButtonComponent', () => {
  let fixture: ComponentFixture<GuestLinkButtonComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [GuestLinkButtonComponent],
      providers: [
        provideZoneChangeDetection(),
        {
          provide: AuthService,
          useValue: { clinic: signal({ name: 'Clínica', slug: 'clinica' }), hasRole: () => true },
        },
        { provide: Clipboard, useValue: { copy: vi.fn(() => true) } },
        { provide: Dialog, useValue: { open: vi.fn() } },
      ],
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(GuestLinkButtonComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('shows the help tooltip without a duplicated native title on the button', () => {
    expect(element.querySelector('app-help-tooltip')).not.toBeNull();
    expect(element.querySelector('button.btn')?.hasAttribute('title')).toBe(false);
  });
});
