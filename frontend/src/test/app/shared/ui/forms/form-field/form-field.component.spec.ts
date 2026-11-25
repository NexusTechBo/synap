import { Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import { FormFieldComponent } from '../../../../../../app/shared/ui/forms/form-field/form-field.component';

@Component({
  imports: [FormFieldComponent, ReactiveFormsModule],
  template: `
    <app-form-field label="Usuario" [tooltip]="tooltip" fieldId="user">
      <input id="user" [formControl]="control" />
    </app-form-field>
  `,
})
class HostComponent {
  tooltip: string | undefined = 'Ayuda del usuario';
  readonly control = new FormControl('');
}

describe('FormFieldComponent label', () => {
  let fixture: ComponentFixture<HostComponent>;
  let element: HTMLElement;

  async function render(tooltip: string | undefined): Promise<void> {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZoneChangeDetection()],
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.tooltip = tooltip;
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => fixture.destroy());

  it('renders a single label linked to the input and the help tooltip beside it', async () => {
    await render('Ayuda del usuario');

    const labels = element.querySelectorAll('label');
    expect(labels).toHaveLength(1);
    expect(labels[0].htmlFor).toBe('user');
    expect(labels[0].textContent?.trim()).toBe('Usuario');
    expect(labels[0].querySelector('app-help-tooltip')).toBeNull();
    expect(element.querySelector('.field-label-row app-help-tooltip')).not.toBeNull();
  });

  it('renders the label without a tooltip when none is provided', async () => {
    await render(undefined);

    expect(element.querySelectorAll('label')).toHaveLength(1);
    expect(element.querySelector('app-help-tooltip')).toBeNull();
  });
});
